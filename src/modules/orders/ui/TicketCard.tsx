"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/ui/cn";
import { displayTableLabel } from "../domain/fulfillment";
import { advanceActionLabel, canCancel, previousStatus } from "../domain/status";
import type { Order } from "../domain/types";
import { elapsedMs, formatElapsed, ticketUrgency, type Urgency } from "../domain/urgency";

const HEADER: Record<Urgency, string> = {
  fresh: "bg-olive-soft text-olive",
  warning: "bg-amber-soft text-amber-ink",
  late: "bg-red text-on-red",
};

const FRAME: Record<Urgency, string> = {
  fresh: "border-line",
  warning: "border-amber/60",
  late: "border-red",
};

/**
 * Kitchen ticket. Presentational: `now` and all actions come from the container.
 * The whole item area is one large tap target that "bumps" the ticket to its next status.
 */
export function TicketCard({
  order,
  now,
  onAdvance,
  onBack,
  onCancel,
  isNew,
}: {
  order: Order;
  now: number;
  onAdvance: (order: Order) => void;
  onBack: (order: Order) => void;
  onCancel: (order: Order) => void;
  isNew?: boolean;
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const urgency = ticketUrgency(order.createdAt, now);
  const action = advanceActionLabel(order.status);
  const canGoBack = previousStatus(order.status) !== null;

  return (
    <article
      data-urgency={urgency}
      className={cn(
        "overflow-hidden rounded-[14px] border-2 bg-surface",
        FRAME[urgency],
        isNew && "animate-flash-in",
      )}
    >
      <header className={cn("flex items-center justify-between gap-3 px-4 py-3", HEADER[urgency])}>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none tabular-nums">{order.code}</p>
          <p className="mt-1 truncate text-base font-semibold">{displayTableLabel(order.tableLabel)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-2xl font-bold tabular-nums leading-none">{formatElapsed(elapsedMs(order.createdAt, now))}</p>
          <Badge tone="neutral" className="bg-black/15 text-inherit">
            {order.source === "staff" ? "Personal" : "Cliente"}
          </Badge>
        </div>
      </header>

      <button
        type="button"
        disabled={!action}
        onClick={() => onAdvance(order)}
        aria-label={action ? `${action} ${order.code}` : undefined}
        className="block min-h-24 w-full px-4 py-3 text-left transition-colors hover:bg-ink/[.04] active:bg-ink/[.08] disabled:cursor-default"
      >
        <ul className="space-y-2.5">
          {order.items.map((item, i) => (
            <li key={`${item.dishId}-${i}`} className="flex items-start gap-3">
              <span className="grid min-w-9 place-items-center rounded-md bg-ink/10 px-1.5 py-0.5 text-xl font-bold tabular-nums">
                {item.quantity}
              </span>
              <span className="min-w-0">
                <span className="block text-xl font-semibold leading-snug">{item.dishName}</span>
                {item.notes ? <span className="block text-base font-medium text-amber-ink">{item.notes}</span> : null}
              </span>
            </li>
          ))}
        </ul>
        {order.notes ? (
          <p className="mt-3 rounded-md bg-amber-soft px-3 py-2 text-base font-medium text-amber-ink">{order.notes}</p>
        ) : null}
        {action ? (
          <span className="mt-4 flex min-h-14 items-center justify-center rounded-[10px] bg-accent text-lg font-bold text-on-accent">
            {action}
          </span>
        ) : null}
      </button>

      <footer className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
        {canGoBack ? (
          <Button variant="ghost" size="lg" onClick={() => onBack(order)} className="min-h-16">
            <Undo2 size={18} aria-hidden /> Regresar
          </Button>
        ) : (
          <span />
        )}
        {canCancel(order.status) ? (
          confirmingCancel ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="lg" onClick={() => setConfirmingCancel(false)} className="min-h-16">
                Conservar
              </Button>
              <Button variant="danger" size="lg" onClick={() => onCancel(order)} className="min-h-16">
                Confirmar cancelación
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="lg" onClick={() => setConfirmingCancel(true)} className="min-h-16 text-red">
              Cancelar
            </Button>
          )
        ) : null}
      </footer>
    </article>
  );
}
