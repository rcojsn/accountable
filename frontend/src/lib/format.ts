import { format } from "date-fns";
import { isoDate } from "./rules";

const US = "en-US"; // commas between thousands, as in "R12,500"

export function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}R${Math.abs(Math.round(n)).toLocaleString(US)}`;
}

const trim = (x: number) => String(Math.round(x * 10) / 10);

/** Chart axes and tight spaces: R12.5k, R1.2M. */
export function moneyShort(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a < 1000) return `${sign}R${Math.round(a)}`;
  const k = Math.round((a / 1e3) * 10) / 10;
  if (k < 1000) return `${sign}R${trim(a / 1e3)}k`;
  const m = Math.round((a / 1e6) * 10) / 10;
  if (m < 1000) return `${sign}R${trim(a / 1e6)}M`;
  return `${sign}R${trim(a / 1e9)}B`;
}

/** For the dashboard sentence: "R2.5 million". */
export function moneyWords(n: number): string {
  return n >= 1e6 ? `R${trim(n / 1e6)} million` : money(n);
}

export const percent = (n: number): string => `${Math.round(n)}%`;

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 21 Nov 2026 */
export const formatDate = (iso: string): string => format(parseDate(iso), "d MMM yyyy");

/** 21 Nov within the current year, otherwise 15 Jan 2027. */
export function formatDateShort(iso: string, today: string = isoDate(new Date())): string {
  return iso.slice(0, 4) === today.slice(0, 4) ? format(parseDate(iso), "d MMM") : formatDate(iso);
}

/** 15:40 */
export const formatTime = (iso: string): string => iso.slice(11, 16);

/** 21 Nov 15:40, with the year when it isn't this year. */
export function formatDateTime(iso: string, today: string = isoDate(new Date())): string {
  return `${formatDateShort(iso, today)} ${formatTime(iso)}`;
}

/** "2 hours ago", "Yesterday 16:20", "18 Nov 10:05". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const [y, mo, d] = iso.slice(0, 10).split("-").map(Number);
  const [h, mi] = iso.slice(11, 16).split(":").map(Number);
  const then = new Date(y, mo - 1, d, h, mi);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);
  const today = isoDate(now);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  if (iso.slice(0, 10) === today) {
    const hours = Math.floor(minutes / 60);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  const yesterday = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  if (iso.slice(0, 10) === yesterday) return `Yesterday ${formatTime(iso)}`;
  return formatDateTime(iso, today);
}

/** "Nov" style label for a `YYYY-MM` month key. */
export const monthLabel = (key: string): string => format(new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1), "MMM");
export const monthLabelLong = (key: string): string => format(new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1), "MMMM yyyy");

/** "Saturday 21 Nov 2026", for the date line above a page title. */
export const formatLongDate = (iso: string): string => format(parseDate(iso), "EEEE d MMM yyyy");

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

export function initials(name: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Local `YYYY-MM-DDTHH:mm` for datetime-local inputs. */
export function nowForInput(now: Date = new Date()): string {
  return `${isoDate(now)}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
