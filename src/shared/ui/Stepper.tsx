"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "./cn";

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "md" | "lg";
  label: string;
}) {
  const box = size === "lg" ? "size-16" : "size-11";
  const btn = cn(
    "grid place-items-center rounded-[10px] border border-line bg-surface text-ink transition-colors",
    "hover:border-ink/30 disabled:pointer-events-none disabled:opacity-40",
    box,
  );
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-2">
      <button type="button" className={btn} aria-label={`Disminuir ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus size={size === "lg" ? 24 : 18} aria-hidden />
      </button>
      <span className={cn("min-w-10 text-center font-semibold tabular-nums", size === "lg" ? "text-2xl" : "text-base")} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} aria-label={`Aumentar ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus size={size === "lg" ? 24 : 18} aria-hidden />
      </button>
    </div>
  );
}
