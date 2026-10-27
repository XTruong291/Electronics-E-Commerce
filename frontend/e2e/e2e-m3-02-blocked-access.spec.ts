import { test, expect } from "@playwright/test";

test.describe("E2E-M3-02: Blocked Access and RBAC Route Guards", () => {
  test("Guest navigating to /admin/users is redirected to /login with redirect query param", async ({
    page,
  }) => {
    await page.goto("/admin/users");
    // Should be redirected to /login?redirect=%2Fadmin%2Fusers
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fusers/);
    await expect(page.locator("text=Đăng nhập tài khoản")).toBeVisible();
  });

  test("CUSTOMER role cannot open /admin/users (403 page) and PATCH /admin/orders/1/status returns 403", async ({
    page,
    request,
  }) => {
    // 1. Customer logs in
    await page.goto("/login");
    await page.locator('input[placeholder="name@example.com"]').fill("customer@example.com");
    await page.locator('input[type="password"]').fill("Customer@123456");
    await page.locator('button[type="submit"]:has-text("Đăng nhập")').click();

    // After login, should be on storefront
    await expect(page).toHaveURL("http://localhost:5173/");

    // 2. Customer attempts to navigate directly to /admin/users
    await page.goto("/admin/users");

    // Route guard should render 403 Result
    await expect(page.locator("text=403 - Quyền truy cập bị từ chối")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator("text=Bạn không có quyền truy cập vào trang này")
    ).toBeVisible();

    // 3. Obtain customer token from login API to test backend order status patch
    const loginRes = await request.post("http://127.0.0.1:8000/api/v1/auth/login", {
      headers: {
        "x-e2e-test": "true",
      },
      data: {
        email: "customer@example.com",
        password: "Customer@123456",
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginData = await loginRes.json();
    const customerToken = loginData.access_token;
    expect(customerToken).toBeDefined();

    // Customer attempts PATCH /api/v1/admin/orders/1/status
    const patchRes = await request.patch(
      "http://127.0.0.1:8000/api/v1/admin/orders/1/status",
      {
        headers: {
          Authorization: `Bearer ${customerToken}`,
        },
      }
    );
    expect(patchRes.status()).toBe(403);
    const errorJson = await patchRes.json();
    expect(errorJson.detail).toContain("Bạn không có quyền truy cập chức năng này");
  });
});
