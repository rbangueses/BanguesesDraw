import { expect, test } from "@playwright/test";

test("library renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "BanguesesDraw" })).toBeVisible();
});
