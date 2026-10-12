"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRepositories } from "@/config/useRepositories";
import { ErrorNote } from "@/shared/ui/feedback";
import { cn } from "@/shared/ui/cn";
import { useLiveRefresh, useResource } from "@/shared/lib/useResource";
import { useNow } from "@/shared/lib/useNow";
import { changeOrderStatus } from "../application/changeOrderStatus";
import { allDayCounts } from "../domain/allDay";
import { nextStatus, previousStatus } from "../domain/status";
import type { Order, OrderStatus } from "../domain/types";
import { TicketCard } from "./TicketCard";
import { useChime } from "./useChime";

const COLUMNS: Array<{ status: OrderStatus; title: string; empty: string }> = [
  { status: "pending", title: "Nuevos", empty: "No hay tickets nuevos" },
  { status: "preparing", title: "En preparación", empty: "Nada en la línea" },
  { status: "ready", title: "Listos", empty: "Nada en espera" },
];

/** Container for /staff/kitchen: realtime board (SSE) with live timers, chime and all-day counts. */
export function KitchenBoard() {
  const { orders } = useRepositories();
  const now = useNow();
  const chime = useChime();
  const [actionError, setActionError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const known = useRef<Set<string> | null>(null);

  const load = useCallback(() => orders.list({ statuses: ["pending", "preparing", "ready"] }), [orders]);
  const { data, error, reload } = useResource(load);
  // SSE pushes changes; the slow poll is only a safety net if a connection silently dies.
  const subscribe = useCallback((onChange: () => void) => orders.subscribe(onChange), [orders]);
  useLiveRefresh(subscribe, reload, 30_000);
  const { enabled: chimeEnabled, play: playChime } = chime;

  // Detect tickets that appeared since the last load: flash them and chime.
  useEffect(() => {
    if (!data) return;
    const ids = new Set(data.map((o) => o.id));
    const previous = known.current;
    known.current = ids;
    if (!previous) return;
    const added = data.filter((o) => !previous.has(o.id) && o.status === "pending").map((o) => o.id);
    if (added.length === 0) return;
    if (chimeEnabled) playChime();
    // Deferred: this is state derived from an external system (the order stream).
    setTimeout(() => setFresh(new Set(added)), 0);
    setTimeout(() => setFresh(new Set()), 2500);
  }, [data, chimeEnabled, playChime]);

  const sorted = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [data],
  );
  const counts = useMemo(() => allDayCounts(sorted), [sorted]);

  async function move(order: Order, to: OrderStatus | null) {
    if (!to) return;
    setActionError(null);
    try {
      await changeOrderStatus({ orders }, order, to);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo guardar el cambio.");
      reload();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Cocina</h1>
          <p className="text-sm text-muted">
            {sorted.length} {sorted.length === 1 ? "ticket abierto" : "tickets abiertos"} &middot; en vivo
          </p>
        </div>
        <button
          type="button"
          onClick={chime.toggle}
          aria-pressed={chime.enabled}
          className={cn(
            "inline-flex min-h-14 items-center gap-2 rounded-full border px-5 text-base font-medium transition-colors",
            chime.enabled ? "border-accent bg-accent-soft text-accent-strong" : "border-line text-muted hover:text-ink",
          )}
        >
          {chime.enabled ? <Volume2 size={20} aria-hidden /> : <VolumeX size={20} aria-hidden />}
          Aviso sonoro {chime.enabled ? "activado" : "desactivado"}
        </button>
      </div>

      {error ? <ErrorNote>No se pudieron cargar los tickets. Reintentando automáticamente.</ErrorNote> : null}
      {actionError ? <ErrorNote>{actionError}</ErrorNote> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_280px]">
        {COLUMNS.map((col) => {
          const tickets = sorted.filter((o) => o.status === col.status);
          return (
            <section key={col.status} aria-label={col.title} className="min-w-0 space-y-3">
              <h2 className="flex items-center justify-between rounded-[10px] bg-surface px-4 py-3 text-lg font-semibold">
                {col.title}
                <span className="tabular-nums text-muted">{tickets.length}</span>
              </h2>
              {tickets.length === 0 ? (
                <p className="rounded-[14px] border border-dashed border-line px-4 py-10 text-center text-muted">{col.empty}</p>
              ) : (
                tickets.map((order) => (
                  <TicketCard
                    key={order.id}
                    order={order}
                    now={now}
                    isNew={fresh.has(order.id)}
                    onAdvance={(o) => move(o, nextStatus(o.status))}
                    onBack={(o) => move(o, previousStatus(o.status))}
                    onCancel={(o) => move(o, "cancelled")}
                  />
                ))
              )}
            </section>
          );
        })}

        <aside aria-label="Totales del turno" className="h-fit space-y-3 rounded-[14px] border border-line bg-surface p-4 xl:sticky xl:top-20">
          <div>
            <h2 className="text-lg font-semibold">Totales del turno</h2>
            <p className="text-sm text-muted">Pendiente de cocinar: nuevos + en preparación</p>
          </div>
          {counts.length === 0 ? (
            <p className="py-6 text-center text-muted">Nada por cocinar</p>
          ) : (
            <ul className="divide-y divide-line">
              {counts.map((c) => (
                <li key={c.dishId} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-lg">{c.dishName}</span>
                  <span className="text-2xl font-bold tabular-nums">{c.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
