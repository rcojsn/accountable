import { test, expect } from "./fixtures";
import { cardsIn, deals, dialog, dropBefore, getJson, pickOption, rand, today, type DealRow } from "./helpers";

const card = (page: import("@playwright/test").Page, id: number) => page.getByTestId(`card-${id}`);
const byPosition = (list: DealRow[], stage: string) => list.filter((d) => d.stage === stage).sort((a, b) => a.position - b.position);
const n = async (loc: import("@playwright/test").Locator) => Number((await loc.textContent())!.replace(/[^\d]/g, ""));

test("dragging a card to another stage changes stage, probability and totals at once, and everything agrees", async ({ page, request }) => {
  const all = await deals(request);
  const d = byPosition(all, "new").find((x) => x.contact_id)!;
  const target = byPosition(all, "qualified")[0];
  await page.goto("/pipeline");
  const [newCount, qCount] = [await n(page.getByTestId("count-new")), await n(page.getByTestId("count-qualified"))];
  const [newValue, qValue] = [await n(page.getByTestId("value-new")), await n(page.getByTestId("value-qualified"))];
  const qExpected = await n(page.getByTestId("expected-qualified"));
  const boardCount = await page.getByTestId("board-count").textContent();

  await dropBefore(page, card(page, d.id), card(page, target.id));

  // totals follow at once (REQ-63)
  await expect(page.getByTestId("count-new")).toHaveText(String(newCount - 1));
  await expect(page.getByTestId("count-qualified")).toHaveText(String(qCount + 1));
  await expect(page.getByTestId("value-new")).toHaveText(rand(newValue - d.value));
  await expect(page.getByTestId("value-qualified")).toHaveText(rand(qValue + d.value));
  await expect(page.getByTestId("expected-qualified")).toHaveText(rand(qExpected + Math.round(d.value * 0.25)));
  await expect(page.getByTestId("board-count")).toHaveText(boardCount!);
  await expect(cardsIn(page, "qualified").first()).toHaveAttribute("data-testid", `card-${d.id}`);

  await expect.poll(async () => (await getJson(request, `/deals/${d.id}`)).stage).toBe("qualified");
  const saved = await getJson(request, `/deals/${d.id}`);
  expect(saved.probability).toBe(25);
  expect(saved.position).toBe(0);

  // the deal's page and its contact's page show the same story
  await page.goto(`/deals/${d.id}`);
  await expect(page.getByLabel("Stage", { exact: true })).toHaveValue("qualified");
  await expect(page.getByTestId("timeline-entry").first()).toContainText("Moved from");
  await page.goto(`/contacts/${d.contact_id}`);
  await expect(page.getByTestId("timeline-entry").filter({ hasText: d.name }).first()).toContainText("Moved from");
  await page.goto("/deals");
  await page.getByLabel("Search deals").fill(d.name);
  await expect(page.getByRole("row").filter({ has: page.getByRole("link", { name: d.name, exact: true }) }).filter({ hasText: "Qualified" }).first()).toBeVisible();
});

test("dragging a card to Won sets the close date to today", async ({ page, request }) => {
  const d = byPosition(await deals(request), "negotiation")[0];
  await page.goto("/pipeline");
  const wonBefore = await n(page.getByTestId("count-won"));
  const firstWon = byPosition(await deals(request), "won")[0];
  await dropBefore(page, card(page, d.id), card(page, firstWon.id));
  await expect(page.getByTestId("count-won")).toHaveText(String(wonBefore + 1));
  await expect.poll(async () => (await getJson(request, `/deals/${d.id}`)).stage).toBe("won");
  const saved = await getJson(request, `/deals/${d.id}`);
  expect(saved.close_date).toBe(today());
  expect(saved.probability).toBe(100);
});

test("reordering within a column keeps the order after a refresh", async ({ page, request }) => {
  const column = byPosition(await deals(request), "proposal");
  const last = column[2]; // a card near the top, so the whole drag stays on screen
  await page.goto("/pipeline");
  await dropBefore(page, card(page, last.id), card(page, column[0].id));
  await expect(cardsIn(page, "proposal").first()).toHaveAttribute("data-testid", `card-${last.id}`);
  await expect.poll(async () => byPosition(await deals(request), "proposal")[0].id).toBe(last.id);
  const expected = [last.id, column[0].id, column[1].id, ...column.slice(3).map((d) => d.id)];
  expect(byPosition(await deals(request), "proposal").map((d) => d.id)).toEqual(expected);
  await page.reload();
  await expect(cardsIn(page, "proposal").first()).toBeVisible();
  const ids = await cardsIn(page, "proposal").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-testid")!.slice(5))));
  expect(ids).toEqual(expected);
});

test("dropping in the middle of another column keeps the card exactly there", async ({ page, request }) => {
  const all = await deals(request);
  const d = byPosition(all, "new")[0];
  const q = byPosition(all, "qualified");
  await page.goto("/pipeline");
  await dropBefore(page, card(page, d.id), card(page, q[2].id));
  await expect.poll(async () => (await getJson(request, `/deals/${d.id}`)).stage).toBe("qualified");
  const now = byPosition(await deals(request), "qualified").map((x) => x.id);
  expect(now).toEqual([q[0].id, q[1].id, d.id, ...q.slice(2).map((x) => x.id)]);
  await page.reload();
  await expect(cardsIn(page, "qualified").first()).toBeVisible();
  const ids = await cardsIn(page, "qualified").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-testid")!.slice(5))));
  expect(ids).toEqual(now);
});

test("adding a deal in a column starts it at that stage, at the top", async ({ page, request }) => {
  await page.goto("/pipeline");
  const before = await n(page.getByTestId("count-proposal"));
  await page.getByRole("button", { name: "Add deal to Proposal" }).click();
  await expect(dialog(page).getByLabel(/^Stage/)).toHaveValue("proposal");
  await dialog(page).getByLabel(/^Name/).fill("Brand new proposal");
  await pickOption(page, /Organization/, "Bluegum Foods");
  await dialog(page).getByLabel(/^Value/).fill("250000");
  await dialog(page).getByRole("button", { name: "Save deal" }).click();
  await expect(page.getByTestId("count-proposal")).toHaveText(String(before + 1));
  await expect(cardsIn(page, "proposal").first()).toContainText("Brand new proposal");
  const saved = (await deals(request)).find((x) => x.name === "Brand new proposal")!;
  expect(saved.stage).toBe("proposal");
  expect(saved.position).toBe(0);
  expect(saved.probability).toBe(50);
});

test("Won and Lost show only the last 30 days, and late cards are marked", async ({ page, request }) => {
  const all = await deals(request);
  const inWindow = (d: DealRow) => d.close_date !== null && d.close_date >= today(-29) && d.close_date <= today();
  await page.goto("/pipeline");
  for (const stage of ["won", "lost"]) {
    const total = all.filter((d) => d.stage === stage).length;
    const visible = all.filter((d) => d.stage === stage && inWindow(d)).length;
    expect(visible).toBeLessThan(total);
    await expect(cardsIn(page, stage)).toHaveCount(visible);
  }
  const late = all.filter((d) => d.is_late).length;
  expect(late).toBeGreaterThanOrEqual(3);
  await expect(page.locator('[data-testid^="card-"]').filter({ hasText: "Late" })).toHaveCount(late);
});

test("a card can be moved with the keyboard", async ({ page, request }) => {
  const d = byPosition(await deals(request), "new")[0];
  await page.goto("/pipeline");
  await card(page, d.id).focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(250);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(250);
  await page.keyboard.press("Space");
  await expect.poll(async () => (await getJson(request, `/deals/${d.id}`)).stage, { timeout: 8000 }).not.toBe("new");
  expect((await getJson(request, `/deals/${d.id}`)).stage).toBe("qualified");
  await expect(page.getByTestId("column-qualified").getByTestId(`card-${d.id}`)).toBeVisible();
});

test("a rejected move rolls back and says so", async ({ page, request, allowConsole }) => {
  allowConsole.push(/409/);
  const all = await deals(request);
  const d = byPosition(all, "new")[0];
  await page.route("**/api/deals/*/move", (route) => route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ detail: "Refused" }) }));
  await page.goto("/pipeline");
  const newCount = await page.getByTestId("count-new").textContent();
  const qCount = await page.getByTestId("count-qualified").textContent();
  const firstQ = byPosition(all, "qualified")[0];
  await dropBefore(page, card(page, d.id), card(page, firstQ.id));
  await expect(page.getByText("The move wasn't saved", { exact: true })).toBeVisible();
  await expect(page.getByTestId("column-new").getByTestId(`card-${d.id}`)).toBeVisible();
  await expect(page.getByTestId("count-new")).toHaveText(newCount!);
  await expect(page.getByTestId("count-qualified")).toHaveText(qCount!);
  expect((await getJson(request, `/deals/${d.id}`)).stage).toBe("new");
});

test("the pipeline header shows open totals", async ({ page, request }) => {
  const open = (await deals(request)).filter((d) => ["new", "qualified", "proposal", "negotiation"].includes(d.stage));
  await page.goto("/pipeline");
  await expect(page.getByTestId("board-count")).toHaveText(String(open.length));
  await expect(page.getByTestId("board-value")).toHaveText(rand(open.reduce((s, d) => s + d.value, 0)));
  await expect(page.getByTestId("board-expected")).toHaveText(rand(open.reduce((s, d) => s + d.expected_revenue, 0)));
});
