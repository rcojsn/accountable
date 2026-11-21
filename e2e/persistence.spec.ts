import { test, expect } from "./fixtures";
import { dialog, getJson } from "./helpers";

test("changes on every screen survive a reload and a fresh browser context", async ({ page, browser }) => {
  await page.goto("/organizations");
  await page.getByRole("button", { name: "New organization" }).click();
  await dialog(page).getByLabel(/^Name/).fill("Persist Org");
  await dialog(page).getByRole("button", { name: "Save organization" }).click();
  await expect(page.getByRole("link", { name: "Persist Org" })).toBeVisible();

  await page.goto("/contacts");
  await page.getByRole("button", { name: "New contact" }).click();
  await dialog(page).getByLabel(/^Name/).fill("Persist Person");
  await dialog(page).getByRole("button", { name: "Save contact" }).click();
  await expect(page.getByRole("link", { name: "Persist Person" })).toBeVisible();

  await page.goto("/deals");
  await page.getByRole("button", { name: "New deal" }).click();
  await dialog(page).getByLabel(/^Name/).fill("Persist Deal");
  await dialog(page).getByRole("combobox", { name: /Organization/ }).click();
  await page.getByRole("option", { name: "Persist Org" }).click();
  await dialog(page).getByLabel(/^Value/).fill("42000");
  await dialog(page).getByRole("button", { name: "Save deal" }).click();
  await page.getByLabel("Search deals").fill("Persist Deal");
  await page.getByRole("link", { name: "Persist Deal" }).click();
  await page.getByLabel(/^Description/).fill("Persisted note");
  await page.getByRole("button", { name: "Log activity" }).click();
  await expect(page.getByText("Persisted note")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Persisted note")).toBeVisible();

  const fresh = await browser.newContext({ baseURL: "http://127.0.0.1:5180", viewport: { width: 1440, height: 900 } });
  const other = await fresh.newPage();
  await other.goto("/organizations");
  await expect(other.getByRole("link", { name: "Persist Org" })).toBeVisible();
  await other.goto("/contacts");
  await expect(other.getByRole("link", { name: "Persist Person" })).toBeVisible();
  await other.goto("/deals");
  await expect(other.getByRole("link", { name: "Persist Deal" })).toBeVisible();
  await other.goto("/pipeline");
  await expect(other.getByText("Persist Deal")).toBeVisible();
  await fresh.close();

  const deals = await getJson(page.request, "/deals");
  const id = deals.find((d: any) => d.name === "Persist Deal").id;
  expect((await getJson(page.request, `/deals/${id}/timeline`))[0].description).toBe("Persisted note");
});
