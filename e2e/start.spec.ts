import { test, expect } from "./fixtures";
import { firstColumn } from "./helpers";

test("opening the app lands on the dashboard with sample data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("headline")).toContainText("expected from");
  await expect(page.getByRole("link", { name: /Dashboard/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("tile-open")).toHaveText(/^R[\d,]+$/);
  await expect(page.getByText("All amounts in South African rand (ZAR)")).toBeVisible();
});

test("every page in the sidebar opens and shows data", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const [name, heading] of [["Deals", "Deals"], ["Contacts", "Contacts"], ["Organizations", "Organizations"]] as const) {
    await nav.getByRole("link", { name: new RegExp(name) }).click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(firstColumn(page).first()).toBeVisible();
    expect(await firstColumn(page).count()).toBeGreaterThan(10);
  }
  await nav.getByRole("link", { name: /Pipeline/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pipeline" })).toBeVisible();
  await expect(page.getByTestId("column-new")).toBeVisible();
  expect(await page.locator('[data-testid^="card-"]').count()).toBeGreaterThan(20);
  await nav.getByRole("link", { name: /Dashboard/ }).click();
  await expect(page.getByTestId("headline")).toBeVisible();
});

test("sidebar counts match the data", async ({ page, request }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: /Deals/ })).toContainText("60");
  await expect(nav.getByRole("link", { name: /Contacts/ })).toContainText("40");
  await expect(nav.getByRole("link", { name: /Organizations/ })).toContainText("15");
  void request;
});

test("an unknown record shows a message instead of breaking", async ({ page, allowConsole }) => {
  allowConsole.push(/404/);
  await page.goto("/deals/99999");
  await expect(page.getByText("That deal isn't here")).toBeVisible();
});
