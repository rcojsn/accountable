import type { APIRequestContext, Locator, Page } from "@playwright/test";
import { API } from "./fixtures";

export interface DealRow {
  id: number; name: string; organization_id: number; organization_name: string; contact_id: number | null; contact_name: string | null;
  stage: string; value: number; probability: number; expected_revenue: number; close_date: string | null; position: number; is_late: boolean;
}

export const getJson = async <T = any>(request: APIRequestContext, path: string): Promise<T> => (await request.get(`${API}/api${path}`)).json();
export const deals = (request: APIRequestContext) => getJson<DealRow[]>(request, "/deals");

/** Today as the app sees it: the date on this computer. */
export function today(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** `R12,500` */
export const rand = (n: number) => `R${Math.round(n).toLocaleString("en-US")}`;

export const dialog = (page: Page) => page.getByRole("dialog");
export const confirmDialog = (page: Page) => page.getByRole("alertdialog");

/** The first cell of every body row. */
export const firstColumn = (page: Page) => page.locator("tbody tr td:first-child");
export const search = (page: Page, noun: string) => page.getByLabel(`Search ${noun}`);

export async function pickOption(page: Page, comboLabel: RegExp | string, optionText: string) {
  await page.getByRole("combobox", { name: comboLabel }).click();
  await page.getByRole("option", { name: optionText, exact: false }).first().click();
}

/** Drags with real mouse steps, a small move first and a small move at the end, so dnd-kit sees a drag. */
export async function dragTo(page: Page, card: Locator, x: number, y: number) {
  const box = (await card.boundingBox())!;
  const sx = box.x + box.width / 2;
  const sy = box.y + 20;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 8, sy + 8, { steps: 4 });
  await page.mouse.move(x, y, { steps: 25 });
  await page.mouse.move(x + 1, y + 1, { steps: 3 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}

/** Drops `card` on the upper part of `target` (so it lands before it). */
export async function dropBefore(page: Page, card: Locator, target: Locator) {
  const t = (await target.boundingBox())!;
  await dragTo(page, card, t.x + t.width / 2, t.y + 12);
}

/** Drops `card` at the bottom of a column: on the lower half of its last card, or in the middle of an empty column. */
export async function dropInColumn(page: Page, card: Locator, stage: string) {
  const col = page.getByTestId(`column-${stage}`);
  const cards = col.locator('[data-testid^="card-"]');
  const n = await cards.count();
  const colBox = (await col.boundingBox())!;
  if (n === 0) return dragTo(page, card, colBox.x + colBox.width / 2, colBox.y + 200);
  const last = (await cards.nth(n - 1).boundingBox())!;
  await dragTo(page, card, last.x + last.width / 2, last.y + last.height * 0.8);
}

export const cardsIn = (page: Page, stage: string) => page.getByTestId(`column-${stage}`).locator('[data-testid^="card-"]');
export const cardNames = (page: Page, stage: string) => cardsIn(page, stage).evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
