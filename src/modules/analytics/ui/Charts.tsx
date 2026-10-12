"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDateKey } from "@/shared/lib/dates";
import { formatMoney } from "@/shared/lib/money";
import type { CategoryShare, DayRevenue, HourOrders, TopDish } from "../domain/aggregations";

/** One accent colour plus neutrals, no gradients, labelled axes and tooltips. */
const ACCENT = "var(--color-accent)";
const GRID = "var(--color-line)";
const TICK = { fill: "var(--color-muted)", fontSize: 12 };
const AXIS_LABEL = { fill: "var(--color-muted)", fontSize: 12 };

type TooltipPayload = { value?: number | string; payload?: Record<string, unknown> };

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  format: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] border border-line bg-surface px-3 py-2 text-sm shadow-md">
      <p className="text-muted">{label}</p>
      <p className="font-semibold tabular-nums">{format(Number(payload[0].value ?? 0))}</p>
    </div>
  );
}

export function RevenueTrendChart({ data }: { data: DayRevenue[] }) {
  const rows = data.map((d) => ({ ...d, label: formatDateKey(d.date), revenue: d.revenueCents / 100 }));
  return (
    <div className="h-72 w-full" role="img" aria-label="Gráfico de líneas de los ingresos por día">
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 20, left: 8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} label={{ value: "Día", position: "insideBottom", offset: -12, ...AXIS_LABEL }} />
          <YAxis tick={TICK} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => `$${v}`} label={{ value: "Ingresos (USD)", angle: -90, position: "insideLeft", ...AXIS_LABEL }} />
          <Tooltip content={<ChartTooltip format={(v) => formatMoney(Math.round(v * 100))} />} cursor={{ stroke: GRID }} />
          <Line type="linear" dataKey="revenue" stroke={ACCENT} strokeWidth={2.5} dot={rows.length <= 8} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrdersByHourChart({ data }: { data: HourOrders[] }) {
  const open = data.filter((d) => d.hour >= 9 && d.hour <= 23);
  const rows = open.map((d) => ({ ...d, label: `${d.hour}h` }));
  return (
    <div className="h-72 w-full" role="img" aria-label="Gráfico de barras de órdenes por hora del día">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 20, left: 8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: GRID }} interval={0} label={{ value: "Hora del día", position: "insideBottom", offset: -12, ...AXIS_LABEL }} />
          <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} width={48} label={{ value: "Órdenes", angle: -90, position: "insideLeft", ...AXIS_LABEL }} />
          <Tooltip content={<ChartTooltip format={(v) => `${v} ${v === 1 ? "orden" : "órdenes"}`} />} cursor={{ fill: "var(--color-ink)", fillOpacity: 0.05 }} />
          <Bar dataKey="orders" fill={ACCENT} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopDishesChart({ data }: { data: TopDish[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Gráfico de barras horizontales de los platos más vendidos por unidades">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 20, left: 8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={TICK} tickLine={false} axisLine={{ stroke: GRID }} allowDecimals={false} label={{ value: "Unidades vendidas", position: "insideBottom", offset: -12, ...AXIS_LABEL }} />
          <YAxis type="category" dataKey="name" tick={TICK} tickLine={false} axisLine={false} width={150} />
          <Tooltip content={<ChartTooltip format={(v) => `${v} ${v === 1 ? "vendido" : "vendidos"}`} />} cursor={{ fill: "var(--color-ink)", fillOpacity: 0.05 }} />
          <Bar dataKey="quantity" fill={ACCENT} radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Category mix as labelled proportion bars (a single accent colour, shares sum to 100%). */
export function CategoryMixBars({ data }: { data: CategoryShare[] }) {
  return (
    <ul className="space-y-4" aria-label="Participación de los ingresos por categoría">
      {data.map((c) => (
        <li key={c.categoryId} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">{c.name}</span>
            <span className="tabular-nums text-muted">
              {formatMoney(c.revenueCents)} &middot; {(c.share * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink/[.08]" role="presentation">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, c.share * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
