import path from "node:path";
import { test, expect } from "./fixtures";

// Saves full-page screenshots at 1440 px wide to docs/screenshots/, to compare by eye with docs/mockups/b-open-plan/.
const out = path.resolve(__dirname, "..", "docs", "screenshots");

for (const [route, name, ready] of [
  ["/", "dashboard", (p: import("@playwright/test").Page) => p.locator(".recharts-area-curve")],
  ["/pipeline", "pipeline", (p: import("@playwright/test").Page) => p.getByTestId("column-won")],
] as const) {
  test(`screenshot of ${name}`, async ({ page }) => {
    await page.goto(route);
    await expect(ready(page)).toBeVisible();
    await page.waitForTimeout(500);
    // The sidebar is fixed to the window, so make the window as tall as the page for a full-height capture.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 1440, height });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `${name}.png`) });
  });
}
