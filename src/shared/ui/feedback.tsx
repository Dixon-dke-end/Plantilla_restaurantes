import type { ReactNode } from "react";
import { cn } from "./cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-[10px] bg-ink/[.07]", className)} />;
}

export function Spinner({ label = "Cargando" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 text-sm text-muted">
      <span className="size-5 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-line px-6 py-12 text-center",
        className,
      )}
    >
      <p className="font-display text-xl text-ink">{title}</p>
      {description ? <p className="max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-[10px] border border-red/30 bg-red-soft px-4 py-3 text-sm text-red">
      {children}
    </p>
  );
}
