import { describe, expect, it } from "vitest";
import type { Deal, Stage } from "../api/types";
import { applyMove, beforeIdForDrop, boardTotals, fullColumns, groupDeals, totals } from "./board";
import { expectedRevenue } from "./rules";

const TODAY = "2026-11-21";

let nextId = 1;
function deal(stage: Stage, position: number, extra: Partial<Deal> = {}): Deal {
  const id = extra.id ?? nextId++;
  const probability = extra.probability ?? { new: 10, qualified: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 }[stage];
  const value = extra.value ?? 1000;
  return {
    id, name: `d${id}`, organization_id: 1, organization_name: "Acme", contact_id: null, contact_name: null,
    stage, value, probability, expected_revenue: expectedRevenue(value, probability), close_date: null, position,
    is_late: false, created_at: "2026-01-01T00:00:00", updated_at: "2026-01-01T00:00:00", ...extra,
  };
}

const ids = (list: Deal[]) => list.map((d) => d.id);

describe("grouping", () => {
  it("makes six columns in position order", () => {
    const deals = [deal("new", 1, { id: 1 }), deal("new", 0, { id: 2 }), deal("qualified", 0, { id: 3 }), deal("lost", 0, { id: 4, close_date: TODAY })];
    const cols = groupDeals(deals, TODAY);
    expect(Object.keys(cols)).toEqual(["new", "qualified", "proposal", "negotiation", "won", "lost"]);
    expect(ids(cols.new)).toEqual([2, 1]);
    expect(ids(cols.qualified)).toEqual([3]);
    expect(ids(cols.lost)).toEqual([4]);
    expect(cols.proposal).toEqual([]);
  });

  it("shows only the last 30 days in Won and Lost", () => {
    const deals = [
      deal("won", 0, { id: 1, close_date: "2026-11-21" }),
      deal("won", 1, { id: 2, close_date: "2026-10-23" }),
      deal("won", 2, { id: 3, close_date: "2026-10-22" }),
      deal("lost", 0, { id: 4, close_date: null }),
      deal("lost", 1, { id: 5, close_date: "2026-11-01" }),
    ];
    const cols = groupDeals(deals, TODAY);
    expect(ids(cols.won)).toEqual([1, 2]);
    expect(ids(cols.lost)).toEqual([5]);
    expect(ids(fullColumns(deals).won)).toEqual([1, 2, 3]);
  });
});

describe("applying a move", () => {
  const base = () => [
    deal("new", 0, { id: 1 }), deal("new", 1, { id: 2 }), deal("new", 2, { id: 3 }),
    deal("qualified", 0, { id: 4, value: 4000 }), deal("qualified", 1, { id: 5 }),
  ];
  const col = (deals: Deal[], s: Stage) => ids(fullColumns(deals)[s]);

  it("reorders within a column", () => {
    const moved = applyMove(base(), 1, "new", null, TODAY);
    expect(col(moved, "new")).toEqual([2, 3, 1]);
    expect(moved.find((d) => d.id === 1)!.position).toBe(2);
    expect(applyMove(base(), 3, "new", 1, TODAY).filter((d) => d.stage === "new").map((d) => [d.id, d.position]).sort()).toEqual([[1, 1], [2, 2], [3, 0]]);
  });

  it("moves between columns at the top, middle and end", () => {
    expect(col(applyMove(base(), 1, "qualified", 4, TODAY), "qualified")).toEqual([1, 4, 5]);
    expect(col(applyMove(base(), 1, "qualified", 5, TODAY), "qualified")).toEqual([4, 1, 5]);
    expect(col(applyMove(base(), 1, "qualified", null, TODAY), "qualified")).toEqual([4, 5, 1]);
    const moved = applyMove(base(), 1, "qualified", null, TODAY);
    expect(fullColumns(moved).new.map((d) => d.position)).toEqual([0, 1]);
  });

  it("changes probability and expected revenue with the stage", () => {
    const d = applyMove(base(), 1, "negotiation", null, TODAY).find((x) => x.id === 1)!;
    expect(d.stage).toBe("negotiation");
    expect(d.probability).toBe(75);
    expect(d.expected_revenue).toBe(750);
  });

  it("sets today's date when moved to Won or Lost, and is not late there", () => {
    const deals = [deal("new", 0, { id: 1, close_date: "2026-01-01", is_late: true })];
    const won = applyMove(deals, 1, "won", null, TODAY)[0];
    expect(won.close_date).toBe(TODAY);
    expect(won.is_late).toBe(false);
    expect(won.probability).toBe(100);
  });

  it("recalculates lateness when reopened with an old close date", () => {
    const deals = [deal("won", 0, { id: 1, close_date: "2026-11-01" })];
    expect(applyMove(deals, 1, "proposal", null, TODAY)[0].is_late).toBe(true);
  });

  it("leaves other fields alone on a reorder", () => {
    const deals = [deal("new", 0, { id: 1, probability: 40 }), deal("new", 1, { id: 2 })];
    expect(applyMove(deals, 1, "new", null, TODAY).find((d) => d.id === 1)!.probability).toBe(40);
  });
});

describe("before_id for a drop", () => {
  it("uses the card below at the top and in the middle", () => {
    expect(beforeIdForDrop([10, 11, 12], 0, [10, 11, 12])).toBe(10);
    expect(beforeIdForDrop([10, 11, 12], 2, [10, 11, 12])).toBe(12);
  });
  it("is null at the end of a column with no hidden cards", () => {
    expect(beforeIdForDrop([10, 11], 2, [10, 11])).toBeNull();
    expect(beforeIdForDrop([], 0, [])).toBeNull();
  });
  it("goes before the first hidden card when dropped below the last visible one", () => {
    expect(beforeIdForDrop([10, 11], 2, [10, 11, 90, 91])).toBe(90);
  });
  it("goes to the top of a column whose cards are all hidden", () => {
    expect(beforeIdForDrop([], 0, [90, 91])).toBe(90);
  });
  it("lands where the drop was, beside hidden cards, once applied", () => {
    const deals = [
      deal("won", 0, { id: 1, close_date: "2026-11-20" }), deal("won", 1, { id: 2, close_date: "2026-11-10" }),
      deal("won", 2, { id: 3, close_date: "2025-01-01" }), deal("new", 0, { id: 9 }),
    ];
    const visible = groupDeals(deals, TODAY).won.map((d) => d.id);
    const full = fullColumns(deals).won.map((d) => d.id);
    const before = beforeIdForDrop(visible, visible.length, full);
    expect(before).toBe(3);
    expect(ids(fullColumns(applyMove(deals, 9, "won", before, TODAY)).won)).toEqual([1, 2, 9, 3]);
  });
});

describe("totals", () => {
  const deals = [
    deal("new", 0, { id: 1, value: 1000 }), deal("qualified", 0, { id: 2, value: 2000 }),
    deal("won", 0, { id: 3, value: 5000 }), deal("lost", 0, { id: 4, value: 700 }),
  ];
  it("totals a column", () => {
    expect(totals(deals.filter((d) => d.stage === "qualified"))).toEqual({ count: 1, value: 2000, expected: 500 });
  });
  it("totals the board from open deals only", () => {
    expect(boardTotals(deals)).toEqual({ count: 2, value: 3000, expected: 100 + 500 });
  });
  it("follows a move at once", () => {
    const moved = applyMove(deals, 2, "won", null, TODAY);
    expect(boardTotals(moved)).toEqual({ count: 1, value: 1000, expected: 100 });
    expect(totals(moved.filter((d) => d.stage === "won")).value).toBe(7000);
  });
});
