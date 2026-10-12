"use client";

import { useCallback, useMemo, useState } from "react";
import { useRepositories } from "@/config/useRepositories";
import { Badge, type BadgeTone } from "@/shared/ui/Badge";
import { EmptyState, ErrorNote, Skeleton } from "@/shared/ui/feedback";
import { Select } from "@/shared/ui/Field";
import { addDays, formatDateTime, startOfDay } from "@/shared/lib/dates";
import { formatMoney } from "@/shared/lib/money";
import { useResource } from "@/shared/lib/useResource";
import { displayTableLabel } from "../domain/fulfillment";
import { statusLabel } from "../domain/status";
import { ORDER_STATUSES, type OrderStatus } from "../domain/types";

const TONES: Record<OrderStatus, BadgeTone> = {
  pending: "amber",
  preparing: "accent",
  ready: "olive",
  served: "neutral",
  cancelled: "red",
};

type Range = "today" | "7d" | "30d" | "all";

/** Container for /staff/orders: history with status and date filters. */
export function OrderHistory() {
  const { orders } = useRepositories();
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [range, setRange] = useState<Range>("today");

  const load = useCallback(() => {
    const today = startOfDay(new Date());
    const from = range === "all" ? undefined : range === "today" ? today : addDays(today, range === "7d" ? -6 : -29);
    return orders.list({ statuses: status === "all" ? undefined : [status], from });
  }, [orders, status, range]);
  const { data, error } = useResource(load);

  const total = useMemo(() => (data ?? []).filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.totalCents, 0), [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Historial de órdenes</h1>
          {data ? (
            <p className="text-sm text-muted">
              {data.length} {data.length === 1 ? "orden" : "órdenes"} &middot; {formatMoney(total)} sin contar canceladas
            </p>
          ) : null}
        </div>
        <div className="flex gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted">Estado</span>
            <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "all")} className="min-w-36">
              <option value="all">Todos</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">Fecha</span>
            <Select value={range} onChange={(e) => setRange(e.target.value as Range)} className="min-w-36">
              <option value="today">Hoy</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="all">Todo el historial</option>
            </Select>
          </label>
        </div>
      </div>

      {error ? <ErrorNote>No se pudieron cargar las órdenes.</ErrorNote> : null}
      {!data && !error ? <Skeleton className="h-72" /> : null}
      {data && data.length === 0 ? <EmptyState title="Ninguna orden coincide con estos filtros" /> : null}
      {data && data.length > 0 ? (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Orden</th>
                <th className="px-4 py-3 font-medium">Registrada</th>
                <th className="px-4 py-3 font-medium">Lugar</th>
                <th className="px-4 py-3 font-medium">Platos</th>
                <th className="px-4 py-3 font-medium">Origen</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.slice(0, 300).map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-semibold tabular-nums">{o.code}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">{formatDateTime(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    {displayTableLabel(o.tableLabel)}
                    {o.customerName ? <span className="text-muted"> &middot; {o.customerName}</span> : null}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted">
                    {o.items.map((i) => `${i.quantity}× ${i.dishName}`).join(", ")}
                  </td>
                  <td className="px-4 py-3">{o.source === "staff" ? "Personal" : "Cliente"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={TONES[o.status]}>{statusLabel(o.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatMoney(o.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
