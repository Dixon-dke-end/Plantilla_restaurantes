import { Check } from "lucide-react";
import { cn } from "@/shared/ui/cn";
import { formatTime } from "@/shared/lib/dates";
import { statusLabel } from "../domain/status";
import type { OrderStatus, PublicOrder } from "../domain/types";

const STEPS: OrderStatus[] = ["pending", "preparing", "ready", "served"];

const reachedAt = (order: PublicOrder, step: OrderStatus): string | null => {
  switch (step) {
    case "pending":
      return order.createdAt;
    case "preparing":
      return order.preparingAt;
    case "ready":
      return order.readyAt;
    case "served":
      return order.servedAt;
    default:
      return null;
  }
};

/** Recibido -> En preparación -> Listo -> Servido. Presentational. */
export function StatusTimeline({ order }: { order: PublicOrder }) {
  if (order.status === "cancelled") {
    return (
      <p role="status" className="rounded-[10px] bg-red-soft px-4 py-3 text-red">
        Este pedido fue cancelado. Consulta con el personal si tienes preguntas.
      </p>
    );
  }
  const current = STEPS.indexOf(order.status);

  return (
    <ol aria-label="Avance del pedido" className="space-y-0">
      {STEPS.map((step, i) => {
        const done = i < current || order.status === "served";
        const active = i === current && order.status !== "served";
        const at = reachedAt(order, step);
        return (
          <li key={step} className="relative flex gap-4 pb-8 last:pb-0" aria-current={active ? "step" : undefined}>
            {i < STEPS.length - 1 ? (
              <span
                aria-hidden
                className={cn("absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5", i < current ? "bg-olive" : "bg-line")}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold",
                done && "border-olive bg-olive text-white",
                active && "border-accent bg-accent text-on-accent",
                !done && !active && "border-line bg-surface text-muted",
              )}
            >
              {done ? <Check size={16} aria-hidden /> : i + 1}
            </span>
            <div className="pt-0.5">
              <p className={cn("font-medium", !done && !active && "text-muted")}>{statusLabel(step)}</p>
              <p className="text-sm text-muted">
                {at && (done || active) ? formatTime(at) : active ? "En curso" : "En espera"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
