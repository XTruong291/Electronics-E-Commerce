import { test, expect } from "@playwright/test";

test.describe("E2E-M3-01: Classic Login & Simulated SSO Callback", () => {
  test("ADMIN can log in via classic form and manage users on /admin/users", async ({
    page,
  }) => {
    await page.goto("/login");

    // Fill in admin credentials
    await page.locator('input[placeholder="name@example.com"]').fill("admin@example.com");
    await page.locator('input[type="password"]').fill("Admin@123456");
    await page.locator('button[type="submit"]:has-text("Đăng nhập")').click();

    // Verify redirected to homepage and user avatar is displayed
    await expect(page).toHaveURL("http://localhost:5173/");
    await expect(page.locator("text=System Admin")).toBeVisible();

    // Navigate to admin portal via header link
    await page.locator('header a[href="/admin"]').click();
    await expect(page).toHaveURL("http://localhost:5173/admin");

    // Navigate to Users page via sidebar menu
    await page.locator("text=Người dùng").click();
    await expect(page).toHaveURL("http://localhost:5173/admin/users");
    await expect(page.locator("text=Quản lý người dùng")).toBeVisible();

    // Use search box to locate admin user on paginated table
    await page.locator('input[placeholder="Tìm theo email hoặc họ tên..."]').fill("admin@example.com");
    await page.locator('button:has-text("Tìm kiếm")').click();
    await expect(page.locator("text=admin@example.com")).toBeVisible();

    // Verify session persistence across page reload via silent refresh
    await page.reload();
    await expect(page.locator("text=Quản lý người dùng")).toBeVisible();
    await expect(page.locator("text=System Admin")).toBeVisible();
  });

  test("SSO callback simulation loads profile and sets in-memory session", async ({
    page,
    request,
  }) => {
    // 1. Get a valid token for customer via backend API
    const authRes = await request.post("http://127.0.0.1:8000/api/v1/auth/login", {
      headers: {
        "x-e2e-test": "true",
      },
      data: {
        email: "customer@example.com",
        password: "Customer@123456",
      },
    });
    expect(authRes.status()).toBe(200);
    const authData = await authRes.json();
    const token = authData.access_token;

    // 2. Navigate to SSO callback page with access_token and redirect=/profile
    await page.goto(`/auth/sso/callback?access_token=${token}&redirect=/profile`);

    // 3. Callback should process token, fetch user profile, and redirect to /profile
    await expect(page).toHaveURL("http://localhost:5173/profile", { timeout: 10000 });
    await expect(page.locator("text=Tài khoản của tôi")).toBeVisible();
    await expect(page.locator('input[value="customer@example.com"]')).toBeVisible();
  });
});
