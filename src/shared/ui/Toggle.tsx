"use client";

import { cn } from "./cn";

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name (also announced for icon-only rows). */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex min-h-11 min-w-11 items-center justify-center disabled:opacity-50"
    >
      <span
        className={cn(
          "relative h-6 w-11 rounded-full border transition-colors duration-200",
          checked ? "border-olive bg-olive" : "border-line bg-ink/10",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-[left] duration-200",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
