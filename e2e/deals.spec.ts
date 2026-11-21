import { test, expect } from "./fixtures";
import { confirmDialog, deals, dialog, firstColumn, getJson, pickOption, rand, search, today } from "./helpers";

test("add, search, sort, edit and delete a deal", async ({ page, request }) => {
  await page.goto("/deals");
  await page.getByRole("button", { name: "New deal" }).click();
  await dialog(page).getByLabel(/^Name/).fill("Zebra crossing upgrade");
  await pickOption(page, /Organization/, "Bluegum Foods");
  await dialog(page).getByLabel(/^Stage/).selectOption("proposal");
  await expect(dialog(page).getByLabel(/Probability/)).toHaveValue("50");
  await dialog(page).getByLabel(/^Value/).fill("777000");
  await dialog(page).getByRole("button", { name: "Save deal" }).click();
  await expect(page.getByText("Deal saved", { exact: true }).first()).toBeVisible();

  await search(page, "deals").fill("zebra");
  await expect(firstColumn(page)).toHaveText(["Zebra crossing upgrade"]);
  const row = page.getByRole("row").nth(1);
  await expect(row).toContainText("R777,000");
  await expect(row).toContainText("50%");
  await expect(row).toContainText("R388,500");

  await page.getByRole("button", { name: "Edit Zebra crossing upgrade" }).click();
  await dialog(page).getByLabel(/^Value/).fill("800000");
  await dialog(page).getByRole("button", { name: "Save deal" }).click();
  await expect(page.getByRole("row").nth(1)).toContainText("R800,000");
  await expect(page.getByRole("row").nth(1)).toContainText("R400,000");

  await page.getByRole("button", { name: "Delete Zebra crossing upgrade" }).click();
  await expect(confirmDialog(page)).toContainText("It has no activities.");
  await confirmDialog(page).getByRole("button", { name: "Delete deal" }).click();
  await expect(page.getByText("Deal deleted", { exact: true })).toBeVisible();
  await page.reload();
  await search(page, "deals").fill("zebra");
  await expect(page.getByText('No deals match "zebra".')).toBeVisible();
  expect((await deals(request)).length).toBe(60);
});

test("sorting by value and clicking again reverses", async ({ page, request }) => {
  await page.goto("/deals");
  const all = await deals(request);
  const values = all.map((d) => d.value);
  const header = page.getByRole("columnheader", { name: /^Value/ });
  await header.getByRole("button").click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await expect(page.getByRole("row").nth(1)).toContainText(rand(Math.min(...values)));
  await header.getByRole("button").click();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  await expect(page.getByRole("row").nth(1)).toContainText(rand(Math.max(...values)));
});

test("late deals are marked in the table", async ({ page, request }) => {
  const all = await deals(request);
  const late = all.filter((d) => d.is_late);
  expect(late.length).toBeGreaterThanOrEqual(3);
  await page.goto("/deals");
  await expect(page.locator("tbody").getByText("Late", { exact: true })).toHaveCount(late.length);
});

test("the stage selector on a deal page changes stage and probability and adds a timeline entry", async ({ page, request }) => {
  const d = (await deals(request)).find((x) => x.stage === "proposal" && x.contact_id)!;
  await page.goto(`/deals/${d.id}`);
  await expect(page.getByRole("heading", { level: 1, name: d.name })).toBeVisible();
  await page.getByLabel("Stage", { exact: true }).selectOption("negotiation");
  await expect(page.getByText("Moved to Negotiation", { exact: true })).toBeVisible();
  await expect(page.getByTestId("timeline-entry").first()).toContainText("Moved from Proposal");
  await expect(page.getByText("75%")).toBeVisible();
  const after = await getJson(request, `/deals/${d.id}`);
  expect(after.stage).toBe("negotiation");
  expect(after.probability).toBe(75);

  await page.getByLabel("Stage", { exact: true }).selectOption("won");
  await expect(page.getByText("Moved to Won", { exact: true })).toBeVisible();
  expect((await getJson(request, `/deals/${d.id}`)).close_date).toBe(today());
  // the contact's page shows the same history, labelled with the deal
  await page.goto(`/contacts/${d.contact_id}`);
  await expect(page.getByTestId("timeline-entry").filter({ hasText: d.name }).first()).toContainText("Moved from");
});

test("deleting a deal deletes its activities", async ({ page, request }) => {
  const d = (await deals(request)).find((x) => x.stage === "negotiation")!;
  const impact = await getJson(request, `/deals/${d.id}/delete-impact`);
  await page.goto(`/deals/${d.id}`);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const n = impact.activities === 1 ? "1 activity" : `${impact.activities} activities`;
  await expect(confirmDialog(page)).toContainText(`Its ${n}, including its stage changes, will be deleted.`);
  await confirmDialog(page).getByRole("button", { name: "Delete deal" }).click();
  await expect(page).toHaveURL(/\/deals$/);
  expect((await request.get(`http://127.0.0.1:8100/api/deals/${d.id}`)).status()).toBe(404);
});

test("the stage filter narrows the deals and combines with search", async ({ page, request }) => {
  const all = await deals(request);
  const won = all.filter((d) => d.stage === "won");
  await page.goto("/deals");
  await page.getByLabel("Filter by stage").selectOption("won");
  await expect(firstColumn(page)).toHaveCount(won.length);
  await search(page, "deals").fill(won[0].name);
  expect(await firstColumn(page).count()).toBe(won.filter((d) => d.name.toLowerCase().includes(won[0].name.toLowerCase())).length);
  await page.getByLabel("Filter by stage").selectOption("all");
  await search(page, "deals").fill("");
  await expect(firstColumn(page)).toHaveCount(all.length);
});
