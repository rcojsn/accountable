/**
 * Pure board logic, kept out of the components so it can be unit tested.
 * It mirrors what POST /api/deals/{id}/move does on the server.
 */
import type { Deal, Stage } from "../api/types";
import { expectedRevenue, inClosedWindow, isLate, isOpen, OPEN_STAGES, PROBABILITY, STAGES } from "./rules";

export type Columns = Record<Stage, Deal[]>;

const emptyColumns = (): Columns => ({ new: [], qualified: [], proposal: [], negotiation: [], won: [], lost: [] });

/** Every deal in its column, in position order (hidden Won and Lost cards included). */
export function fullColumns(deals: Deal[]): Columns {
  const cols = emptyColumns();
  for (const d of deals) cols[d.stage].push(d);
  for (const s of STAGES) cols[s].sort((a, b) => a.position - b.position || a.id - b.id);
  return cols;
}

/** The six board columns: Won and Lost show only the last 30 days (REQ-61). */
export function groupDeals(deals: Deal[], today: string): Columns {
  const cols = fullColumns(deals);
  cols.won = cols.won.filter((d) => inClosedWindow(d.close_date, today));
  cols.lost = cols.lost.filter((d) => inClosedWindow(d.close_date, today));
  return cols;
}

/**
 * The `before_id` to send when a card is dropped into a column.
 * `visibleOthers` is the column as shown, without the dragged card; `dropIndex` is where the card now sits in it.
 * `fullOthers` is the whole column in position order, without the dragged card, hidden cards included.
 */
export function beforeIdForDrop(visibleOthers: number[], dropIndex: number, fullOthers: number[]): number | null {
  if (dropIndex < visibleOthers.length) return visibleOthers[dropIndex];
  if (visibleOthers.length === 0) return fullOthers[0] ?? null; // nothing visible: top of the column
  // Below the last visible card: just after it, so hidden older cards stay below (REQ-62).
  const after = fullOthers.indexOf(visibleOthers[visibleOthers.length - 1]) + 1;
  return fullOthers[after] ?? null;
}

/** Applies a move to the deals list the way the server will, so the board and totals update at once (REQ-63). */
export function applyMove(deals: Deal[], dealId: number, stage: Stage, beforeId: number | null, today: string): Deal[] {
  const moving = deals.find((d) => d.id === dealId);
  if (!moving) return deals;
  const cols = fullColumns(deals);
  const oldStage = moving.stage;
  const ids = (s: Stage) => cols[s].filter((d) => d.id !== dealId).map((d) => d.id);
  const target = ids(stage);
  const at = beforeId === null ? target.length : target.indexOf(beforeId);
  target.splice(at === -1 ? target.length : at, 0, dealId);

  const positions = new Map<number, number>();
  target.forEach((id, i) => positions.set(id, i));
  if (oldStage !== stage) ids(oldStage).forEach((id, i) => positions.set(id, i));

  return deals.map((d) => {
    let next = d;
    if (positions.has(d.id)) next = { ...next, position: positions.get(d.id)! };
    if (d.id === dealId && oldStage !== stage) {
      const probability = PROBABILITY[stage];
      const closeDate = stage === "won" || stage === "lost" ? today : d.close_date;
      next = {
        ...next, stage, probability, close_date: closeDate,
        expected_revenue: expectedRevenue(d.value, probability), is_late: isLate(stage, closeDate, today),
      };
    }
    return next;
  });
}

export interface Totals {
  count: number;
  value: number;
  expected: number;
}

export function totals(deals: Deal[]): Totals {
  return deals.reduce(
    (t, d) => ({ count: t.count + 1, value: t.value + d.value, expected: t.expected + d.expected_revenue }),
    { count: 0, value: 0, expected: 0 },
  );
}

/** Total value and expected revenue of every open deal (REQ-63). */
export function boardTotals(deals: Deal[]): Totals {
  return totals(deals.filter((d) => isOpen(d.stage)));
}

export { OPEN_STAGES };
