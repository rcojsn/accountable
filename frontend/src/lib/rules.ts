/** The same rules as backend/accountable/rules.py, so the browser and the server agree. */
import type { Stage } from "../api/types";

export const STAGES: Stage[] = ["new", "qualified", "proposal", "negotiation", "won", "lost"];
export const OPEN_STAGES: Stage[] = ["new", "qualified", "proposal", "negotiation"];
export const STAGE_NAMES: Record<Stage, string> = {
  new: "New", qualified: "Qualified", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost",
};
export const PROBABILITY: Record<Stage, number> = { new: 10, qualified: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 };
export const CLOSED_WINDOW_DAYS = 30;

/** Dates are `YYYY-MM-DD` strings, so they compare as text. */
export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
export const todayIso = (): string => isoDate(new Date());

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDate(new Date(y, m - 1, d + days));
}

export const isOpen = (stage: Stage): boolean => OPEN_STAGES.includes(stage);

export function isLate(stage: Stage, closeDate: string | null, today: string): boolean {
  return isOpen(stage) && closeDate !== null && closeDate < today;
}

export type FollowUpState = "none" | "done" | "overdue" | "due";
export function followUpState(followUp: string | null, done: boolean, today: string): FollowUpState {
  if (followUp === null) return "none";
  if (done) return "done";
  return followUp < today ? "overdue" : "due";
}

export function expectedRevenue(value: number, probability: number): number {
  return Math.floor((value * probability + 50) / 100);
}

export function inClosedWindow(closeDate: string | null, today: string): boolean {
  if (closeDate === null) return false;
  return closeDate >= addDays(today, -(CLOSED_WINDOW_DAYS - 1)) && closeDate <= today;
}
