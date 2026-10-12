"use client";

import { cn } from "./cn";

export type TabItem<T extends string> = { value: T; label: string; count?: number };

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
  size = "md",
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0", className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-150",
              size === "lg" ? "min-h-14 px-6 text-base" : "min-h-11",
              active
                ? "border-ink bg-ink text-paper"
                : "border-line bg-surface text-muted hover:border-ink/30 hover:text-ink",
            )}
          >
            {item.label}
            {item.count !== undefined ? <span className="tabular-nums opacity-70">{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
