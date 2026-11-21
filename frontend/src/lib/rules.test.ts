import { describe, expect, it } from "vitest";
import { addDays, expectedRevenue, followUpState, inClosedWindow, isLate, OPEN_STAGES, PROBABILITY, STAGES } from "./rules";

// The same cases as backend/tests/test_rules.py, so the two sides agree.
const TODAY = "2026-11-21";

describe("rules (mirrors test_rules.py)", () => {
  it("has the fixed probabilities", () => {
    expect(PROBABILITY).toEqual({ new: 10, qualified: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 });
    expect(STAGES).toEqual(["new", "qualified", "proposal", "negotiation", "won", "lost"]);
  });

  it("is late only for open stages with a past close date", () => {
    for (const s of OPEN_STAGES) {
      expect(isLate(s, "2026-11-20", TODAY)).toBe(true);
      expect(isLate(s, TODAY, TODAY)).toBe(false);
      expect(isLate(s, "2026-12-01", TODAY)).toBe(false);
      expect(isLate(s, null, TODAY)).toBe(false);
    }
    expect(isLate("won", "2020-01-01", TODAY)).toBe(false);
    expect(isLate("lost", "2020-01-01", TODAY)).toBe(false);
  });

  it("works out follow-up states", () => {
    expect(followUpState(null, false, TODAY)).toBe("none");
    expect(followUpState("2026-11-20", false, TODAY)).toBe("overdue");
    expect(followUpState(TODAY, false, TODAY)).toBe("due");
    expect(followUpState("2026-11-28", false, TODAY)).toBe("due");
    expect(followUpState("2026-11-01", true, TODAY)).toBe("done");
  });

  it("works out expected revenue", () => {
    expect(expectedRevenue(100000, 25)).toBe(25000);
    expect(expectedRevenue(0, 75)).toBe(0);
    expect(expectedRevenue(1_000_000_000, 100)).toBe(1_000_000_000);
    expect(expectedRevenue(10, 25)).toBe(3);
  });

  it("has a 30-day closed window with exact edges", () => {
    expect(inClosedWindow(TODAY, TODAY)).toBe(true);
    expect(inClosedWindow("2026-10-23", TODAY)).toBe(true);
    expect(inClosedWindow("2026-10-22", TODAY)).toBe(false);
    expect(inClosedWindow("2026-11-22", TODAY)).toBe(false);
    expect(inClosedWindow(null, TODAY)).toBe(false);
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
