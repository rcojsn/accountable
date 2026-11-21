import { test, expect } from "./fixtures";
import { confirmDialog, deals, dialog, firstColumn, getJson, search } from "./helpers";

test("add, search, sort, open, edit and delete an organization", async ({ page, request }) => {
  await page.goto("/organizations");
  await page.getByRole("button", { name: "New organization" }).click();
  await dialog(page).getByLabel(/^Name/).fill("Zulu Trading Co");
  await dialog(page).getByLabel("Industry").fill("Retail");
  await dialog(page).getByLabel("Website").fill("zulutrading.example");
  await dialog(page).getByRole("button", { name: "Save organization" }).click();
  await expect(page.getByText("Organization saved", { exact: true })).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);

  await search(page, "organizations").fill("zulu");
  await expect(firstColumn(page)).toHaveText(["Zulu Trading Co"]);
  await search(page, "organizations").fill("");
  await expect(firstColumn(page)).toHaveCount(16);

  const heading = page.getByRole("columnheader", { name: /Name/ });
  await expect(heading).toHaveAttribute("aria-sort", "ascending");
  const asc = await firstColumn(page).allTextContents();
  await heading.getByRole("button").click();
  await expect(heading).toHaveAttribute("aria-sort", "descending");
  expect(await firstColumn(page).allTextContents()).toEqual([...asc].reverse());

  await page.getByRole("link", { name: "Zulu Trading Co" }).click();
  await expect(page).toHaveURL(/\/organizations\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Zulu Trading Co" })).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await dialog(page).getByLabel("Industry").fill("Wholesale");
  await dialog(page).getByRole("button", { name: "Save organization" }).click();
  await expect(page.getByText("Wholesale")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Wholesale")).toBeVisible(); // survives a refresh (REQ-3)
  expect((await getJson(request, "/organizations")).some((o: any) => o.name === "Zulu Trading Co" && o.industry === "Wholesale")).toBe(true);
});

test("deleting an organization asks first, with the real counts, and keeps its contacts", async ({ page, request }) => {
  const orgs = await getJson(request, "/organizations");
  const org = orgs.find((o: any) => o.contact_count >= 2 && o.open_deal_count >= 1);
  const impact = await getJson(request, `/organizations/${org.id}/delete-impact`);
  const detail = await getJson(request, `/organizations/${org.id}`);
  const contactIds: number[] = detail.contacts.map((c: any) => c.id);
  const dealIds: number[] = detail.deals.map((d: any) => d.id);

  await page.goto("/organizations");
  await page.getByRole("button", { name: `Delete ${org.name}` }).click();
  const dlg = confirmDialog(page);
  await expect(dlg.getByRole("heading", { name: `Delete ${org.name}?` })).toBeVisible();
  const dealsText = impact.deals === 1 ? "1 deal" : `${impact.deals} deals`;
  const acts = impact.activities === 1 ? "1 activity" : `${impact.activities} activities`;
  const contacts = impact.contacts === 1 ? "1 contact" : `${impact.contacts} contacts`;
  await expect(dlg).toContainText(`Its ${dealsText} and their ${acts} will be deleted.`);
  await expect(dlg).toContainText(`Its ${contacts} will be kept, with no organization.`);
  await dlg.getByRole("button", { name: "Cancel" }).click();
  expect((await getJson(request, "/organizations")).length).toBe(15);

  await page.getByRole("button", { name: `Delete ${org.name}` }).click();
  await confirmDialog(page).getByRole("button", { name: "Delete organization" }).click();
  await expect(page.getByText("Organization deleted", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: org.name, exact: true })).toHaveCount(0);

  const remaining = await deals(request);
  expect(remaining.filter((d) => dealIds.includes(d.id))).toEqual([]);
  for (const id of contactIds) expect((await getJson(request, `/contacts/${id}`)).organization_id).toBeNull();
  await page.reload();
  await expect(page.getByRole("link", { name: org.name, exact: true })).toHaveCount(0);
});

test("an organization page lists its contacts and deals and starts new ones with it filled in", async ({ page, request }) => {
  const orgs = await getJson(request, "/organizations");
  const org = orgs.find((o: any) => o.contact_count >= 1 && o.open_deal_count >= 1);
  await page.goto(`/organizations/${org.id}`);
  await expect(page.getByRole("heading", { level: 2, name: "Contacts" })).toBeVisible();
  await page.getByRole("button", { name: "New contact" }).click();
  await expect(dialog(page).getByRole("combobox", { name: /Organization/ })).toContainText(org.name);
  await dialog(page).getByLabel(/^Name/).fill("Nandi Test");
  await dialog(page).getByRole("button", { name: "Save contact" }).click();
  await expect(page.getByRole("link", { name: "Nandi Test" })).toBeVisible();

  await page.getByRole("button", { name: "New deal" }).click();
  await expect(dialog(page).getByRole("combobox", { name: /Organization/ })).toContainText(org.name);
  await dialog(page).getByLabel(/^Name/).fill("Prefilled deal");
  await dialog(page).getByLabel(/^Value/).fill("12000");
  await dialog(page).getByRole("button", { name: "Save deal" }).click();
  await expect(page.getByRole("link", { name: "Prefilled deal" })).toBeVisible();
});
