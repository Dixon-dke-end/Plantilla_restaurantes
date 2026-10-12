import { addDays, eachDayKey, startOfDay } from "@/shared/lib/dates";
import type { Order } from "@/modules/orders/domain/types";
import type { DishEvent, Period } from "./types";

/** Minimal catalog view the analytics need (decoupled from the menu module). */
export type DishRef = { id: string; name: string; categoryId: string; hasModel: boolean };
export type CategoryRef = { id: string; name: string };

export type Range = {
  /** Inclusive start, exclusive end (local midnight boundaries). */
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  days: number;
};

const PERIOD_DAYS: Record<Period, number> = { today: 1, "7d": 7, "30d": 30 };

export function periodRange(period: Period, now: Date): Range {
  const days = PERIOD_DAYS[period];
  const today = startOfDay(now);
  const start = addDays(today, -(days - 1));
  return {
    start,
    end: addDays(today, 1),
    prevStart: addDays(start, -days),
    prevEnd: start,
    days,
  };
}

/** Relative change in percent; null when there is no baseline to compare with. */
export function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

const inRange = (iso: string, start: Date, end: Date) => {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
};

/** Orders that count towards metrics: not cancelled and inside [start, end). */
export function filterOrdersInRange(orders: Order[], start: Date, end: Date): Order[] {
  return orders.filter((o) => o.status !== "cancelled" && inRange(o.createdAt, start, end));
}

export function filterEventsInRange(events: DishEvent[], start: Date, end: Date): DishEvent[] {
  return events.filter((e) => inRange(e.createdAt, start, end));
}

export type Kpis = {
  revenueCents: number;
  orderCount: number;
  avgOrderCents: number;
  /** Orders containing an AR-enabled dish / AR launches. Null when nobody launched AR. */
  arConversion: number | null;
};

export function computeKpis(orders: Order[], events: DishEvent[], arDishIds: ReadonlySet<string>): Kpis {
  const revenueCents = orders.reduce((s, o) => s + o.totalCents, 0);
  const orderCount = orders.length;
  const arLaunches = events.filter((e) => e.kind === "ar_launch" && arDishIds.has(e.dishId)).length;
  const arOrders = orders.filter((o) => o.items.some((i) => arDishIds.has(i.dishId))).length;
  return {
    revenueCents,
    orderCount,
    avgOrderCents: orderCount === 0 ? 0 : Math.round(revenueCents / orderCount),
    arConversion: arLaunches === 0 ? null : arOrders / arLaunches,
  };
}

export type DayRevenue = { date: string; revenueCents: number; orders: number };

export function revenueByDay(orders: Order[], range: Range): DayRevenue[] {
  const rows = new Map<string, DayRevenue>(
    eachDayKey(range.start, new Date(range.end.getTime() - 1)).map((date) => [
      date,
      { date, revenueCents: 0, orders: 0 },
    ]),
  );
  for (const o of orders) {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const row = rows.get(key);
    if (row) {
      row.revenueCents += o.totalCents;
      row.orders += 1;
    }
  }
  return [...rows.values()];
}

export type HourOrders = { hour: number; orders: number };

export function ordersByHour(orders: Order[]): HourOrders[] {
  const rows: HourOrders[] = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
  for (const o of orders) rows[new Date(o.createdAt).getHours()].orders += 1;
  return rows;
}

export type TopDish = { dishId: string; name: string; quantity: number; revenueCents: number };

export function topDishes(orders: Order[], limit = 5): TopDish[] {
  const map = new Map<string, TopDish>();
  for (const o of orders) {
    for (const i of o.items) {
      const row = map.get(i.dishId) ?? { dishId: i.dishId, name: i.dishName, quantity: 0, revenueCents: 0 };
      row.quantity += i.quantity;
      row.revenueCents += i.unitPriceCents * i.quantity;
      map.set(i.dishId, row);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenueCents - a.revenueCents || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export type CategoryShare = { categoryId: string; name: string; revenueCents: number; share: number };

export function categoryMix(orders: Order[], dishes: DishRef[], categories: CategoryRef[]): CategoryShare[] {
  const categoryOfDish = new Map(dishes.map((d) => [d.id, d.categoryId]));
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const revenue = new Map<string, number>();
  for (const o of orders) {
    for (const i of o.items) {
      const category = categoryOfDish.get(i.dishId) ?? "other";
      revenue.set(category, (revenue.get(category) ?? 0) + i.unitPriceCents * i.quantity);
    }
  }
  const total = [...revenue.values()].reduce((s, v) => s + v, 0);
  if (total === 0) return [];
  return [...revenue.entries()]
    .filter(([, v]) => v > 0)
    .map(([categoryId, revenueCents]) => ({
      categoryId,
      name: names.get(categoryId) ?? "Otros",
      revenueCents,
      share: revenueCents / total,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents || a.name.localeCompare(b.name));
}

export type DishPerformanceRow = {
  dishId: string;
  name: string;
  hasModel: boolean;
  views: number;
  arLaunches: number;
  orders: number;
  unitsSold: number;
  revenueCents: number;
  /** Orders containing the dish / detail-page views. Null without views. */
  conversion: number | null;
};

export function dishPerformance(orders: Order[], events: DishEvent[], dishes: DishRef[]): DishPerformanceRow[] {
  const rows = new Map<string, DishPerformanceRow>(
    dishes.map((d) => [
      d.id,
      {
        dishId: d.id,
        name: d.name,
        hasModel: d.hasModel,
        views: 0,
        arLaunches: 0,
        orders: 0,
        unitsSold: 0,
        revenueCents: 0,
        conversion: null,
      },
    ]),
  );
  for (const e of events) {
    const row = rows.get(e.dishId);
    if (!row) continue;
    if (e.kind === "view") row.views += 1;
    else row.arLaunches += 1;
  }
  for (const o of orders) {
    const seen = new Set<string>();
    for (const i of o.items) {
      const row = rows.get(i.dishId);
      if (!row) continue;
      row.unitsSold += i.quantity;
      row.revenueCents += i.unitPriceCents * i.quantity;
      if (!seen.has(i.dishId)) {
        seen.add(i.dishId);
        row.orders += 1;
      }
    }
  }
  for (const row of rows.values()) row.conversion = row.views > 0 ? row.orders / row.views : null;
  return [...rows.values()].sort((a, b) => b.revenueCents - a.revenueCents || a.name.localeCompare(b.name));
}

export type DashboardInput = {
  orders: Order[];
  events: DishEvent[];
  dishes: DishRef[];
  categories: CategoryRef[];
};

export type DashboardData = {
  range: Range;
  current: Kpis;
  previous: Kpis;
  deltas: { revenue: number | null; orders: number | null; avgOrder: number | null; arConversion: number | null };
  revenueByDay: DayRevenue[];
  ordersByHour: HourOrders[];
  topDishes: TopDish[];
  categoryMix: CategoryShare[];
  dishPerformance: DishPerformanceRow[];
};

export function buildDashboard(input: DashboardInput, period: Period, now: Date): DashboardData {
  const range = periodRange(period, now);
  const arDishIds = new Set(input.dishes.filter((d) => d.hasModel).map((d) => d.id));

  const orders = filterOrdersInRange(input.orders, range.start, range.end);
  const events = filterEventsInRange(input.events, range.start, range.end);
  const prevOrders = filterOrdersInRange(input.orders, range.prevStart, range.prevEnd);
  const prevEvents = filterEventsInRange(input.events, range.prevStart, range.prevEnd);

  const current = computeKpis(orders, events, arDishIds);
  const previous = computeKpis(prevOrders, prevEvents, arDishIds);

  return {
    range,
    current,
    previous,
    deltas: {
      revenue: percentChange(current.revenueCents, previous.revenueCents),
      orders: percentChange(current.orderCount, previous.orderCount),
      avgOrder: percentChange(current.avgOrderCents, previous.avgOrderCents),
      arConversion: percentChange(current.arConversion, previous.arConversion),
    },
    revenueByDay: revenueByDay(orders, range),
    ordersByHour: ordersByHour(orders),
    topDishes: topDishes(orders, 6),
    categoryMix: categoryMix(orders, input.dishes, input.categories),
    dishPerformance: dishPerformance(orders, events, input.dishes),
  };
}
