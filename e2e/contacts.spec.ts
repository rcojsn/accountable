import { test, expect } from "./fixtures";
import { confirmDialog, dialog, firstColumn, getJson, search } from "./helpers";

async function addContact(page: import("@playwright/test").Page, name: string, status: string) {
  await page.getByRole("button", { name: "New contact" }).click();
  await dialog(page).getByLabel(/^Name/).fill(name);
  await dialog(page).getByLabel(/^Status/).selectOption(status);
  await dialog(page).getByRole("button", { name: "Save contact" }).click();
  await expect(page.getByText("Contact saved", { exact: true }).first()).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);
}

test("add a lead, a qualified contact and a customer; filter with counts; search; edit and delete", async ({ page, request }) => {
  await page.goto("/contacts");
  const filter = page.getByRole("group", { name: "Filter by status" });
  const before = await getJson(request, "/contacts");
  const n = (s: string) => before.filter((c: any) => c.status === s).length;
  await expect(filter.getByRole("button", { name: /^All/ })).toContainText(String(before.length));

  await addContact(page, "Aaron Lead", "lead");
  await addContact(page, "Bianca Qualified", "qualified");
  await addContact(page, "Carlos Customer", "customer");
  await expect(filter.getByRole("button", { name: /^Lead/ })).toContainText(String(n("lead") + 1));
  await expect(filter.getByRole("button", { name: /^Qualified/ })).toContainText(String(n("qualified") + 1));
  await expect(filter.getByRole("button", { name: /^Customer/ })).toContainText(String(n("customer") + 1));

  await filter.getByRole("button", { name: /^Qualified/ }).click();
  expect(await firstColumn(page).count()).toBe(n("qualified") + 1);
  await search(page, "contacts").fill("bianca");
  await expect(firstColumn(page)).toHaveText(["Bianca Qualified"]);
  await search(page, "contacts").fill("aaron");
  await expect(page.getByText('No contacts match "aaron".')).toBeVisible(); // Aaron is a lead, the filter is Qualified
  await page.getByRole("button", { name: "Clear search" }).click();
  await filter.getByRole("button", { name: /^All/ }).click();

  await page.getByRole("button", { name: "Edit Carlos Customer" }).click();
  await dialog(page).getByLabel(/^Status/).selectOption("lead");
  await dialog(page).getByLabel("Job title").fill("Buyer");
  await dialog(page).getByRole("button", { name: "Save contact" }).click();
  await expect(page.getByText("Contact saved", { exact: true }).first()).toBeVisible();
  await search(page, "contacts").fill("carlos");
  await expect(page.getByRole("row").nth(1)).toContainText("Buyer");
  await expect(page.getByRole("row").nth(1)).toContainText("Lead");

  await page.getByRole("button", { name: "Delete Carlos Customer" }).click();
  await expect(confirmDialog(page)).toContainText("Delete Carlos Customer?");
  await confirmDialog(page).getByRole("button", { name: "Delete contact" }).click();
  await expect(page.getByText("Contact deleted", { exact: true })).toBeVisible();
  await expect(firstColumn(page)).toHaveCount(0);
  await page.reload();
  expect((await getJson(request, "/contacts")).length).toBe(before.length + 2);
});

test("deleting a contact keeps their deals with no main contact", async ({ page, request }) => {
  const contacts = await getJson(request, "/contacts");
  let target: any;
  for (const c of contacts) {
    const d = await getJson(request, `/contacts/${c.id}`);
    if (d.deals.length >= 1) { target = d; break; }
  }
  const impact = await getJson(request, `/contacts/${target.id}/delete-impact`);
  await page.goto(`/contacts/${target.id}`);
  await expect(page.getByRole("heading", { level: 1, name: target.name })).toBeVisible();
  await expect(page.getByRole("link", { name: target.deals[0].name }).first()).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const dealsText = impact.deals === 1 ? "1 deal" : `${impact.deals} deals`;
  await expect(confirmDialog(page)).toContainText(`Their ${dealsText} will be kept, with no main contact.`);
  await confirmDialog(page).getByRole("button", { name: "Delete contact" }).click();
  await expect(page).toHaveURL(/\/contacts$/);
  for (const d of target.deals) {
    const after = await getJson(request, `/deals/${d.id}`);
    expect(after.contact_id).toBeNull();
  }
});
