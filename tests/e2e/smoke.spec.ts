import { expect, test } from "@playwright/test";

test("public landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /build practical analyst judgment/i,
    })
  ).toBeVisible();
});

test("sign-in shell renders", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByText(/forgot password\?/i)).toBeVisible();
});

test("guest access to dashboard redirects to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
});
