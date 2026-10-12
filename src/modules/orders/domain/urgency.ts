export const WARNING_AFTER_MIN = 8;
export const LATE_AFTER_MIN = 15;

export type Urgency = "fresh" | "warning" | "late";

const MIN = 60_000;

const toMs = (value: string | number | Date) =>
  typeof value === "number" ? value : new Date(value).getTime();

/** Milliseconds since the ticket was created, never negative (tolerates clock skew). */
export function elapsedMs(createdAt: string | number | Date, now: string | number | Date): number {
  return Math.max(0, toMs(now) - toMs(createdAt));
}

/** <8 min fresh, 8-15 min (inclusive) warning, >15 min late. */
export function ticketUrgency(createdAt: string | number | Date, now: string | number | Date): Urgency {
  const minutes = elapsedMs(createdAt, now) / MIN;
  if (minutes > LATE_AFTER_MIN) return "late";
  if (minutes >= WARNING_AFTER_MIN) return "warning";
  return "fresh";
}

/** m:ss under an hour, h:mm:ss afterwards. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}
