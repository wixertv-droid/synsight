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

test.describe("auth happy path", () => {
  test("admin login, dashboard access, and logout", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="identifier"]').fill("admin@synsight.local");
    await page.locator('input[name="password"]').fill("admin");
    await page.getByRole("button", { name: /anmelden/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.locator("#synsight-dashboard")).toBeVisible();

    await page.getByRole("button", { name: /abmelden/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("register (auto-verify), login, dashboard, logout", async ({ page }) => {
    const email = `e2e.${Date.now()}@example.com`;
    await page.goto("/register");
    await page.locator('input[name="firstName"]').fill("Erika");
    await page.locator('input[name="lastName"]').fill("Muster");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("SecurePass1!");
    await page.locator('input[name="passwordConfirm"]').fill("SecurePass1!");
    await page.getByRole("button", { name: /konto erstellen/i }).click();

    // AUTO_VERIFY_EMAIL=true → immediate login surface
    await expect(page).toHaveURL(/\/login\?registered=1/, { timeout: 20_000 });

    await page.locator('input[name="identifier"]').fill(email);
    await page.locator('input[name="password"]').fill("SecurePass1!");
    await page.getByRole("button", { name: /anmelden/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.locator("#synsight-dashboard")).toBeVisible();

    await page.getByRole("button", { name: /abmelden/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
