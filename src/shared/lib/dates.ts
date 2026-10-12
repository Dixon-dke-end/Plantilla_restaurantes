export const MINUTE_MS = 60_000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Calendar-aware (DST safe) day arithmetic in local time. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Every local calendar day touched by [start, end], as YYYY-MM-DD keys. */
export function eachDayKey(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const last = startOfDay(end).getTime();
  for (let d = startOfDay(start); d.getTime() <= last; d = addDays(d, 1)) {
    keys.push(dateKey(d));
  }
  return keys;
}

/** UI language is Spanish; "es-US" keeps the 12-hour clock and US dollar conventions of the restaurant. */
export const APP_LOCALE = "es-US";

const timeFmt = new Intl.DateTimeFormat(APP_LOCALE, { hour: "numeric", minute: "2-digit" });
const dateTimeFmt = new Intl.DateTimeFormat(APP_LOCALE, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const shortDateFmt = new Intl.DateTimeFormat(APP_LOCALE, { month: "short", day: "numeric" });

export const formatTime = (iso: string | Date) => timeFmt.format(new Date(iso));
export const formatDateTime = (iso: string | Date) => dateTimeFmt.format(new Date(iso));
export const formatShortDate = (iso: string | Date) => shortDateFmt.format(new Date(iso));

/** "2026-03-10" -> "10 mar" without timezone shifts. */
export function formatDateKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return shortDateFmt.format(new Date(y, m - 1, d));
}

const relativeFmt = new Intl.RelativeTimeFormat("es", { numeric: "always", style: "short" });

/** "justo ahora", "hace 5 min", "hace 2 h", "hace 3 d". Future or sub-minute differences read as "justo ahora". */
export function formatRelativeTime(from: string | number | Date, now: string | number | Date = new Date()): string {
  const diff = new Date(now).getTime() - new Date(from).getTime();
  if (diff < MINUTE_MS) return "justo ahora";
  const minutes = Math.floor(diff / MINUTE_MS);
  if (minutes < 60) return relativeFmt.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relativeFmt.format(-hours, "hour");
  return relativeFmt.format(-Math.floor(hours / 24), "day");
}
