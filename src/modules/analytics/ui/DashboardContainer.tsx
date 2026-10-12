"use client";

import { useCallback, useMemo, useState } from "react";
import { useRepositories } from "@/config/useRepositories";
import { Badge } from "@/shared/ui/Badge";
import { Card, CardHeader } from "@/shared/ui/Card";
import { EmptyState, ErrorNote, Skeleton } from "@/shared/ui/feedback";
import { Tabs } from "@/shared/ui/Tabs";
import { formatMoney } from "@/shared/lib/money";
import { useResource } from "@/shared/lib/useResource";
import { hasArModel } from "@/modules/menu/domain/dish";
import { buildDashboard, periodRange } from "../domain/aggregations";
import { formatPercent } from "../domain/format";
import type { Period } from "../domain/types";
import { CategoryMixBars, OrdersByHourChart, RevenueTrendChart, TopDishesChart } from "./Charts";
import { KpiCard } from "./KpiCard";

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
];

/** Container for /admin: loads 60 days of data once and aggregates it with pure domain functions. */
export function DashboardContainer() {
  const { orders, analytics, dishes, categories } = useRepositories();
  const [period, setPeriod] = useState<Period>("7d");

  const load = useCallback(async () => {
    const now = new Date();
    const since = periodRange("30d", now).prevStart; // the longest window plus its comparison period
    const [o, e, d, c] = await Promise.all([
      orders.list({ from: since }),
      analytics.listDishEvents(since),
      dishes.list({ includeUnavailable: true }),
      categories.list(),
    ]);
    return { orders: o, events: e, dishes: d, categories: c, loadedAt: now };
  }, [orders, analytics, dishes, categories]);
  const { data, error } = useResource(load);

  const dashboard = useMemo(
    () =>
      data
        ? buildDashboard(
            {
              orders: data.orders,
              events: data.events,
              dishes: data.dishes.map((d) => ({ id: d.id, name: d.name, categoryId: d.categoryId, hasModel: hasArModel(d) })),
              categories: data.categories,
            },
            period,
            data.loadedAt,
          )
        : null,
    [data, period],
  );

  if (error) return <ErrorNote>No se pudieron cargar las métricas: {error.message}</ErrorNote>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Resumen</h1>
          <p className="text-sm text-muted">Cómo va el restaurante y cómo usan la AR los clientes.</p>
        </div>
        <Tabs label="Período" items={PERIODS} value={period} onChange={setPeriod} />
      </div>

      {!dashboard ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      ) : (
        <>
          <section aria-label="Métricas clave" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Ingresos" value={formatMoney(dashboard.current.revenueCents)} deltaPct={dashboard.deltas.revenue} />
            <KpiCard label="Órdenes" value={String(dashboard.current.orderCount)} deltaPct={dashboard.deltas.orders} />
            <KpiCard label="Ticket promedio" value={formatMoney(dashboard.current.avgOrderCents)} deltaPct={dashboard.deltas.avgOrder} />
            <KpiCard
              label="Conversión AR"
              value={formatPercent(dashboard.current.arConversion)}
              deltaPct={dashboard.deltas.arConversion}
              hint="Órdenes con un plato AR por cada lanzamiento de AR"
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="pb-4">
              <CardHeader title="Tendencia de ingresos" description="Ingresos por día" />
              <div className="px-3 pt-4">
                <RevenueTrendChart data={dashboard.revenueByDay} />
              </div>
            </Card>
            <Card className="pb-4">
              <CardHeader title="Órdenes por hora" description="Identifica las horas pico" />
              <div className="px-3 pt-4">
                <OrdersByHourChart data={dashboard.ordersByHour} />
              </div>
            </Card>
            <Card className="pb-4">
              <CardHeader title="Platos más vendidos" description="Por unidades vendidas" />
              <div className="px-3 pt-4">
                {dashboard.topDishes.length ? <TopDishesChart data={dashboard.topDishes} /> : <EmptyState title="Sin ventas en este período" className="m-4" />}
              </div>
            </Card>
            <Card>
              <CardHeader title="Mezcla de categorías" description="Participación en los ingresos" />
              <div className="p-5">
                {dashboard.categoryMix.length ? <CategoryMixBars data={dashboard.categoryMix} /> : <EmptyState title="Sin ventas en este período" />}
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader title="Rendimiento de los platos" description="Visitas, lanzamientos de AR y lo que se convirtió en órdenes" />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-y border-line text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Plato</th>
                    <th className="px-3 py-3 text-right font-medium">Visitas</th>
                    <th className="px-3 py-3 text-right font-medium">Lanzamientos AR</th>
                    <th className="px-3 py-3 text-right font-medium">Órdenes</th>
                    <th className="px-3 py-3 text-right font-medium">Ingresos</th>
                    <th className="px-5 py-3 text-right font-medium">Conversión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {dashboard.dishPerformance.map((row) => (
                    <tr key={row.dishId}>
                      <td className="px-5 py-3 font-medium">
                        {row.name} {row.hasModel ? <Badge tone="accent" className="ml-1">AR</Badge> : null}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.views}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.hasModel ? row.arLaunches : "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.orders}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatMoney(row.revenueCents)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatPercent(row.conversion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
