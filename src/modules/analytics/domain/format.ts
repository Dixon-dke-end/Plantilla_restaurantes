export type DeltaTone = "up" | "down" | "flat";

const MINUS = "−";
const EM_DASH = "—";

export function formatDelta(pct: number | null): string {
  if (pct === null) return EM_DASH;
  const abs = Math.abs(pct).toFixed(1);
  if (pct > 0) return `+${abs}%`;
  if (pct < 0) return `${MINUS}${abs}%`;
  return `${abs}%`;
}

export function deltaTone(pct: number | null): DeltaTone {
  if (pct === null || pct === 0) return "flat";
  return pct > 0 ? "up" : "down";
}

export function formatPercent(ratio: number | null): string {
  return ratio === null ? EM_DASH : `${(ratio * 100).toFixed(1)}%`;
}
