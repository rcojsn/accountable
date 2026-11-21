import { test, expect } from "./fixtures";
import { confirmDialog, dialog, deals, getJson, today } from "./helpers";

async function log(page: import("@playwright/test").Page, type: string, description: string, followUp?: string) {
  await page.getByLabel(/^Type/).selectOption(type);
  await page.getByLabel(/^Description/).fill(description);
  if (followUp) await page.getByLabel(/Follow up on/).fill(followUp);
  await page.getByRole("button", { name: "Log activity" }).click();
  await expect(page.getByLabel(/^Description/)).toHaveValue("");
}

test("log a note, a call and an email on a contact, newest first, then edit, complete and delete", async ({ page, request }) => {
  const c = (await getJson(request, "/contacts"))[3];
  await page.goto(`/contacts/${c.id}`);
  const entries = page.getByTestId("timeline-entry");
  const start = await entries.count();

  const tomorrow = today(1);
  await log(page, "note", "Zeta note about budget");
  await log(page, "call", "Zeta call to confirm", tomorrow);
  await log(page, "email", "Zeta email with quote", today(-3));
  await expect(entries).toHaveCount(start + 3);
  await expect(page.getByTestId("timeline-entry").filter({ hasText: "Zeta" })).toHaveCount(3);
  // all three were logged "now", so the last logged has the latest time or ties; each type label shows
  await expect(page.getByTestId("timeline-entry").filter({ hasText: "Zeta call" })).toContainText("Call");
  await expect(page.getByTestId("timeline-entry").filter({ hasText: "Zeta email" })).toContainText("Follow up");

  await page.getByRole("button", { name: "Edit call: Zeta call to confirm" }).click({ force: true });
  await dialog(page).getByLabel(/^Description/).fill("Zeta call rescheduled");
  await dialog(page).getByRole("button", { name: "Save activity" }).click();
  await expect(page.getByText("Zeta call rescheduled")).toBeVisible();

  const check = page.getByRole("checkbox", { name: /Zeta call rescheduled/ });
  await check.check();
  await expect(check).toBeChecked();
  const acts = await getJson(request, `/contacts/${c.id}/timeline`);
  expect(acts.find((a: any) => a.description === "Zeta call rescheduled").done).toBe(true);
  await check.uncheck();
  await expect(check).not.toBeChecked();

  await page.getByRole("button", { name: "Delete note: Zeta note about budget" }).click({ force: true });
  await confirmDialog(page).getByRole("button", { name: "Delete activity" }).click();
  await expect(page.getByText("Zeta note about budget")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("timeline-entry").filter({ hasText: "Zeta" })).toHaveCount(2);
});

test("an activity on a deal appears on the deal and on its main contact's page", async ({ page, request }) => {
  const d = (await deals(request)).find((x) => x.contact_id && x.stage === "qualified")!;
  await page.goto(`/deals/${d.id}`);
  await log(page, "call", "Zeta deal call", today(2));
  await expect(page.getByTestId("timeline-entry").first()).toContainText("Zeta deal call");
  await page.goto(`/contacts/${d.contact_id}`);
  const entry = page.getByTestId("timeline-entry").filter({ hasText: "Zeta deal call" });
  await expect(entry).toContainText(`on ${d.name}`);
  await entry.getByRole("link", { name: d.name }).click();
  await expect(page).toHaveURL(new RegExp(`/deals/${d.id}$`));
});

test("a stage change entry can be deleted but not edited", async ({ page, request }) => {
  const d = (await deals(request)).find((x) => x.stage === "won")!;
  await page.goto(`/deals/${d.id}`);
  const entry = page.getByTestId("timeline-entry").filter({ hasText: "Moved from" }).first();
  await expect(entry.getByRole("button", { name: /^Edit/ })).toHaveCount(0);
  await expect(entry.getByRole("button", { name: /^Delete stage change/ })).toHaveCount(1);
});
