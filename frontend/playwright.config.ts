import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    headless: true,
    extraHTTPHeaders: {
      "x-e2e-test": "true",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "..\\backend\\.venv\\Scripts\\uvicorn app.main:app --port 8000",
      url: "http://127.0.0.1:8000/api/v1/health",
      reuseExistingServer: false,
      cwd: "../backend",
      timeout: 30000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: false,
      cwd: ".",
      timeout: 30000,
    },
  ],
});
