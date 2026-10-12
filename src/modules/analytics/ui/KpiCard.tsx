import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { cn } from "@/shared/ui/cn";
import { deltaTone, formatDelta } from "../domain/format";

const TONE_CLASS = {
  up: "text-olive",
  down: "text-red",
  flat: "text-muted",
} as const;

/** KPI tile: label, big tabular value and the change versus the previous period. */
export function KpiCard({
  label,
  value,
  deltaPct,
  hint,
}: {
  label: string;
  value: string;
  deltaPct: number | null;
  hint?: string;
}) {
  const tone = deltaTone(deltaPct);
  const Icon = tone === "up" ? ArrowUpRight : tone === "down" ? ArrowDownRight : Minus;
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-3 flex items-center gap-1.5 text-sm">
        <span className={cn("inline-flex items-center gap-1 font-medium tabular-nums", TONE_CLASS[tone])}>
          <Icon size={14} aria-hidden />
          <span data-tone={tone}>{formatDelta(deltaPct)}</span>
        </span>
        <span className="text-muted">vs. período anterior</span>
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}
