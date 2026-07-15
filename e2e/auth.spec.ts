import { expect, test } from "@playwright/test";

test.describe("auth surfaces", () => {
  test("login page renders without design regressions on shell", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("form")).toBeVisible();
  });

  test("register page shows password confirmation field", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator('input[name="passwordConfirm"]')).toBeVisible();
  });

  test("unguarded access to dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).toContain("from=%2Fdashboard");
  });

  test("unguarded access to onboarding redirects to login", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/login/);
  });
});
