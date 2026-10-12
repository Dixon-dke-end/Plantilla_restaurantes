"use client";

import { useCallback, useEffect } from "react";
import { useRepositories } from "@/config/useRepositories";
import { Card } from "@/shared/ui/Card";
import { EmptyState, ErrorNote, Skeleton } from "@/shared/ui/feedback";
import { LinkButton } from "@/shared/ui/Button";
import { formatRelativeTime } from "@/shared/lib/dates";
import { formatMoney } from "@/shared/lib/money";
import { useNow } from "@/shared/lib/useNow";
import { useResource } from "@/shared/lib/useResource";
import { displayTableLabel } from "../domain/fulfillment";
import { StatusTimeline } from "./StatusTimeline";

const POLL_MS = 5000;

/** Container for /order/[id]: public status page, polled every 5 seconds. */
export function OrderTracker({ id }: { id: string }) {
  const { orders } = useRepositories();
  const now = useNow();
  const load = useCallback(() => orders.getPublic(id), [orders, id]);
  const { data: order, loading, error, reload } = useResource(load);

  const finished = order?.status === "served" || order?.status === "cancelled";
  useEffect(() => {
    if (finished) return;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [reload, finished]);

  if (loading) return <Skeleton className="h-96" />;
  if (error && !order) return <ErrorNote>No se pudo cargar tu pedido. Reintentando...</ErrorNote>;
  if (!order) {
    return (
      <EmptyState
        title="No encontramos ese pedido"
        description="Revisa el enlace o pide ayuda a nuestro personal."
        action={<LinkButton href="/menu" variant="secondary">Volver al menú</LinkButton>}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card className="space-y-6 p-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted">Pedido</p>
          <p className="font-display text-5xl tabular-nums">{order.code}</p>
          <p className="mt-1 text-muted">
            {displayTableLabel(order.tableLabel)} &middot; {formatRelativeTime(order.createdAt, now)}
          </p>
        </div>
        <StatusTimeline order={order} />
        {!finished ? <p className="text-sm text-muted">Esta página se actualiza automáticamente.</p> : null}
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-xl">Tu pedido</h2>
        <ul className="mt-4 divide-y divide-line">
          {order.items.map((item, i) => (
            <li key={`${item.dishId}-${i}`} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="font-medium">
                  <span className="tabular-nums">{item.quantity}</span> &times; {item.dishName}
                </p>
                {item.notes ? <p className="text-sm text-muted">{item.notes}</p> : null}
              </div>
              <p className="tabular-nums">{formatMoney(item.unitPriceCents * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-muted">Total</span>
          <span className="text-xl font-semibold tabular-nums">{formatMoney(order.totalCents)}</span>
        </div>
      </Card>
    </div>
  );
}
