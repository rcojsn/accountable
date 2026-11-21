import { test, expect } from "./fixtures";
import { dialog, getJson } from "./helpers";

test("each form refuses to save without its required fields and says which", async ({ page, request }) => {
  await page.goto("/organizations");
  await page.getByRole("button", { name: "New organization" }).click();
  await dialog(page).getByRole("button", { name: "Save organization" }).click();
  await expect(dialog(page).getByText("Required")).toHaveCount(1);
  await expect(dialog(page).getByLabel(/^Name/)).toBeFocused();
  await dialog(page).getByRole("button", { name: "Cancel" }).click();

  await page.goto("/contacts");
  await page.getByRole("button", { name: "New contact" }).click();
  await dialog(page).getByRole("button", { name: "Save contact" }).click();
  await expect(dialog(page).getByText("Required")).toHaveCount(1);
  await expect(dialog(page).getByLabel(/^Name/)).toBeFocused();
  await dialog(page).getByRole("button", { name: "Cancel" }).click();

  await page.goto("/deals");
  await page.getByRole("button", { name: "New deal" }).click();
  await dialog(page).getByRole("button", { name: "Save deal" }).click();
  await expect(dialog(page).getByText("Required")).toHaveCount(3); // name, organization, value
  await expect(dialog(page).getByLabel(/^Name/)).toBeFocused();
  await dialog(page).getByRole("button", { name: "Cancel" }).click();

  const before = await getJson(request, "/deals");
  expect(before.length).toBe(60);
  expect((await getJson(request, "/organizations")).length).toBe(15);
  expect((await getJson(request, "/contacts")).length).toBe(40);

  const c = (await getJson(request, "/contacts"))[0];
  await page.goto(`/contacts/${c.id}`);
  await page.getByRole("button", { name: "Log activity" }).click();
  await expect(page.getByText("Required")).toHaveCount(1);
  await expect(page.getByLabel(/^Description/)).toBeFocused();
});

test("the server refuses a deal without a name too", async ({ request }) => {
  const r = await request.post("http://127.0.0.1:8100/api/deals", { data: { organization_id: 1, stage: "new", value: 5 } });
  expect(r.status()).toBe(422);
});
