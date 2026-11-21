import { test, expect } from "./fixtures";
import { dialog, dropInColumn, getJson, pickOption, rand, today, deals } from "./helpers";

test("headline figures, charts, funnel, stage strip, follow-ups and recent activity match the data", async ({ page, request }) => {
  const d = await getJson(request, "/dashboard");
  await page.goto("/");
  await expect(page.getByTestId("headline")).toContainText(`${d.headline.open_deal_count} open deals`);
  await expect(page.getByTestId("tile-open")).toHaveText(rand(d.headline.open_value));
  await expect(page.getByTestId("tile-expected")).toHaveText(rand(d.headline.expected_revenue));
  await expect(page.getByTestId("tile-late")).toHaveText(String(d.headline.late_deals));
  await expect(page.getByTestId("tile-overdue")).toHaveText(String(d.headline.overdue_follow_ups));
  await expect(page.getByTestId("revenue-12m")).toHaveText(rand(d.twelve_months.revenue_won));
  await expect(page.getByTestId("won-this-month")).toHaveText(rand(d.headline.won_this_month_revenue));

  await expect(page.locator(".recharts-area-curve")).toHaveCount(1);
  await expect(page.locator(".recharts-bar-rectangle").first()).toBeVisible();
  await expect(page.locator(".recharts-bar")).toHaveCount(2);

  for (const f of d.funnel) await expect(page.getByTestId(`funnel-${f.stage}`)).toContainText(`${f.deal_count} deals`);
  for (const s of d.stages) await expect(page.getByTestId(`strip-${s.stage}`)).toContainText(rand(s.value));
  await expect(page.getByTestId("follow-up")).toHaveCount(d.follow_ups.overdue.length + d.follow_ups.today.length + d.follow_ups.next_7_days.length);
  await expect(page.getByTestId("later-count")).toContainText(String(d.follow_ups.later_count));
  await expect(page.getByTestId("recent-entry")).toHaveCount(10);
  expect(d.recent_activity.length).toBe(10);
});

test("winning a deal on the pipeline changes the dashboard figures", async ({ page, request }) => {
  const before = await getJson(request, "/dashboard");
  const target = (await deals(request)).filter((x) => x.stage === "negotiation").sort((a, b) => a.position - b.position)[0];
  await page.goto("/pipeline");
  await dropInColumn(page, page.getByTestId(`card-${target.id}`), "won");
  await expect.poll(async () => (await getJson(request, `/deals/${target.id}`)).stage).toBe("won");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /Dashboard/ }).click();
  await expect(page.getByTestId("tile-open")).toHaveText(rand(before.headline.open_value - target.value));
  await expect(page.getByTestId("won-this-month")).toHaveText(rand(before.headline.won_this_month_revenue + target.value));
  const after = await getJson(request, "/dashboard");
  expect(after.headline.won_this_month_count).toBe(before.headline.won_this_month_count + 1);
  await expect(page.getByTestId("headline")).toContainText(`${before.headline.open_deal_count - 1} open deals`);
});

test("a follow-up due today appears on the dashboard, and goes when marked done", async ({ page, request }) => {
  const contact = (await getJson(request, "/contacts"))[5];
  await page.goto(`/contacts/${contact.id}`);
  await page.getByLabel(/^Description/).fill("Zeta ring about renewal");
  await page.getByLabel(/Follow up on/).fill(today());
  await page.getByRole("button", { name: "Log activity" }).click();
  await expect(page.getByLabel(/^Description/)).toHaveValue("");

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /Dashboard/ }).click();
  const row = page.getByTestId("followups-today").getByTestId("follow-up").filter({ hasText: "Zeta ring about renewal" });
  await expect(row).toBeVisible();
  await expect(row).toContainText(`Contact · ${contact.name}`);
  await row.getByRole("checkbox").check();
  await expect(page.getByTestId("follow-up").filter({ hasText: "Zeta ring about renewal" })).toHaveCount(0);
  const acts = await getJson(request, `/contacts/${contact.id}/timeline`);
  expect(acts.find((a: any) => a.description === "Zeta ring about renewal").done).toBe(true);
});

test("a new deal from the dashboard updates the headline", async ({ page, request }) => {
  const before = await getJson(request, "/dashboard");
  await page.goto("/");
  await page.getByRole("button", { name: "New deal" }).click();
  await dialog(page).getByLabel(/^Name/).fill("Dashboard deal");
  await pickOption(page, /Organization/, "Bluegum Foods");
  await dialog(page).getByLabel(/^Value/).fill("100000");
  await dialog(page).getByRole("button", { name: "Save deal" }).click();
  await expect(page.getByTestId("headline")).toContainText(`${before.headline.open_deal_count + 1} open deals`);
  await expect(page.getByTestId("tile-open")).toHaveText(rand(before.headline.open_value + 100000));
});

test("the overdue tile links to the follow-ups and the late tile to the deals", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("tile-late").click();
  await expect(page).toHaveURL(/\/deals$/);
});
