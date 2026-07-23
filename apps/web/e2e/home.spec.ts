import { test, expect } from "@playwright/test";

test.describe("Home Page Smoke Test", () => {
  test("should display landing layout elements correctly", async ({ page }) => {
    // Navigate to local home route
    await page.goto("/");

    // Check title/header logo
    await expect(page.locator("text=GitForge").first()).toBeVisible();

    // Check hero message
    await expect(page.locator("h1")).toContainText(
      "Build and deploy on the AI Cloud.",
    );

    // Check primary buttons exist
    const ctaButton = page.locator("text=Start Deploying");
    await expect(ctaButton).toBeVisible();
  });
});
