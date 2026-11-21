import { describe, expect, it } from "vitest";
import { formatDate, formatDateShort, formatTime, initials, money, moneyShort, moneyWords, relativeTime } from "./format";

describe("money", () => {
  it("formats whole rand with commas", () => {
    expect(money(12500)).toBe("R12,500");
    expect(money(0)).toBe("R0");
    expect(money(1_000_000_000)).toBe("R1,000,000,000");
  });
  it("shortens for chart axes", () => {
    expect(moneyShort(12500)).toBe("R12.5k");
    expect(moneyShort(1_200_000)).toBe("R1.2M");
    expect(moneyShort(0)).toBe("R0");
    expect(moneyShort(950)).toBe("R950");
    expect(moneyShort(12000)).toBe("R12k");
    expect(moneyShort(999_960)).toBe("R1M");
  });
  it("says millions in words for the dashboard sentence", () => {
    expect(moneyWords(2_500_000)).toBe("R2.5 million");
    expect(moneyWords(450_000)).toBe("R450,000");
  });
});

describe("dates and times", () => {
  it("formats South African dates", () => {
    expect(formatDate("2026-11-21")).toBe("21 Nov 2026");
    expect(formatDate("2027-01-05")).toBe("5 Jan 2027");
  });
  it("leaves out this year's year", () => {
    expect(formatDateShort("2026-11-21", "2026-11-21")).toBe("21 Nov");
    expect(formatDateShort("2027-01-15", "2026-11-21")).toBe("15 Jan 2027");
  });
  it("uses a 24-hour clock", () => {
    expect(formatTime("2026-11-21T15:40:00")).toBe("15:40");
    expect(formatTime("2026-11-21T09:05:00")).toBe("09:05");
  });
});

describe("relative times", () => {
  const now = new Date(2026, 10, 21, 15, 0);
  it("describes recent times", () => {
    expect(relativeTime("2026-11-21T15:00:00", now)).toBe("Just now");
    expect(relativeTime("2026-11-21T14:45:00", now)).toBe("15 minutes ago");
    expect(relativeTime("2026-11-21T13:00:00", now)).toBe("2 hours ago");
    expect(relativeTime("2026-11-21T14:00:00", now)).toBe("1 hour ago");
  });
  it("says yesterday, then the date", () => {
    expect(relativeTime("2026-11-20T16:20:00", now)).toBe("Yesterday 16:20");
    expect(relativeTime("2026-11-18T10:05:00", now)).toBe("18 Nov 10:05");
    expect(relativeTime("2025-12-18T10:05:00", now)).toBe("18 Dec 2025 10:05");
  });
});

it("makes initials", () => {
  expect(initials("Thandi Mokoena")).toBe("TM");
  expect(initials("Pieter van der Merwe")).toBe("PM");
  expect(initials("Cher")).toBe("C");
  expect(initials(null)).toBe("");
});
