import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type BadgeTone = "neutral" | "accent" | "olive" | "amber" | "red";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-ink/[.06] text-muted",
  accent: "bg-accent-soft text-accent-strong",
  olive: "bg-olive-soft text-olive",
  amber: "bg-amber-soft text-amber-ink",
  red: "bg-red-soft text-red",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone };

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium leading-5",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
