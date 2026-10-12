import { describe, expect, it } from "vitest";
import {
  buildDashboard,
  categoryMix,
  computeKpis,
  dishPerformance,
  filterEventsInRange,
  filterOrdersInRange,
  ordersByHour,
  percentChange,
  periodRange,
  revenueByDay,
  topDishes,
  type DishRef,
} from "./aggregations";
import type { DishEvent } from "./types";
import type { Order } from "@/modules/orders/domain/types";

const NOW = new Date(2026, 2, 10, 15, 0, 0); // Tue 10 Mar 2026, 15:00 local

type Line = [dishId: string, name: string, price: number, qty: number];

function order(at: Date, lines: Line[], status: Order["status"] = "served"): Order {
  const items = lines.map(([dishId, dishName, unitPriceCents, quantity]) => ({
    dishId,
    dishName,
    unitPriceCents,
    quantity,
    notes: "",
  }));
  return {
    id: `${at.getTime()}-${Math.random()}`,
    code: "A-001",
    status,
    source: "customer",
    tableLabel: "Mesa 1",
    customerName: "",
    notes: "",
    totalCents: items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0),
    createdBy: null,
    createdAt: at.toISOString(),
    updatedAt: at.toISOString(),
    preparingAt: null,
    readyAt: null,
    servedAt: null,
    cancelledAt: null,
    items,
  };
}

const ev = (dishId: string, kind: DishEvent["kind"], at: Date): DishEvent => ({
  dishId,
  kind,
  createdAt: at.toISOString(),
});

const dishes: DishRef[] = [
  { id: "cake", name: "Carrot Cake", categoryId: "des", hasModel: true },
  { id: "steak", name: "Ribeye", categoryId: "main", hasModel: false },
];
const categories = [
  { id: "main", name: "Mains" },
  { id: "des", name: "Desserts" },
];

describe("periodRange", () => {
  it("today = local day vs yesterday", () => {
    const r = periodRange("today", NOW);
    expect(r.start).toEqual(new Date(2026, 2, 10));
    expect(r.end).toEqual(new Date(2026, 2, 11));
    expect(r.prevStart).toEqual(new Date(2026, 2, 9));
    expect(r.prevEnd).toEqual(new Date(2026, 2, 10));
    expect(r.days).toBe(1);
  });
  it("7d covers the last seven local days including today and a prior equal window", () => {
    const r = periodRange("7d", NOW);
    expect(r.start).toEqual(new Date(2026, 2, 4));
    expect(r.end).toEqual(new Date(2026, 2, 11));
    expect(r.prevStart).toEqual(new Date(2026, 1, 25));
    expect(r.prevEnd).toEqual(new Date(2026, 2, 4));
    expect(r.days).toBe(7);
  });
  it("30d spans thirty days", () => {
    const r = periodRange("30d", NOW);
    expect(r.days).toBe(30);
    expect(r.start).toEqual(new Date(2026, 1, 9));
  });
});

describe("percentChange", () => {
  it("computes relative change", () => {
    expect(percentChange(110, 100)).toBeCloseTo(10);
    expect(percentChange(50, 100)).toBeCloseTo(-50);
  });
  it("returns null when there is no previous baseline", () => {
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(5, null)).toBeNull();
    expect(percentChange(null, 5)).toBeNull();
  });
  it("returns 0 when both are zero", () => {
    expect(percentChange(0, 0)).toBe(0);
  });
});

describe("filters", () => {
  it("drops cancelled orders and orders outside the half-open range", () => {
    const range = periodRange("today", NOW);
    const inside = order(new Date(2026, 2, 10, 9), [["cake", "Carrot Cake", 900, 1]]);
    const cancelled = order(new Date(2026, 2, 10, 10), [["cake", "Carrot Cake", 900, 1]], "cancelled");
    const yesterday = order(new Date(2026, 2, 9, 23, 59), [["cake", "Carrot Cake", 900, 1]]);
    const boundary = order(new Date(2026, 2, 11, 0, 0), [["cake", "Carrot Cake", 900, 1]]);
    const result = filterOrdersInRange([inside, cancelled, yesterday, boundary], range.start, range.end);
    expect(result).toEqual([inside]);
  });
  it("filters events by range", () => {
    const range = periodRange("today", NOW);
    const events = [ev("cake", "view", new Date(2026, 2, 10, 8)), ev("cake", "view", new Date(2026, 2, 9, 8))];
    expect(filterEventsInRange(events, range.start, range.end)).toHaveLength(1);
  });
});

describe("computeKpis", () => {
  it("handles empty data without NaN", () => {
    expect(computeKpis([], [], new Set())).toEqual({
      revenueCents: 0,
      orderCount: 0,
      avgOrderCents: 0,
      arConversion: null,
    });
  });
  it("computes revenue, count, average and AR conversion", () => {
    const orders = [
      order(new Date(2026, 2, 10, 12), [["cake", "Carrot Cake", 900, 2]]), // 1800
      order(new Date(2026, 2, 10, 13), [["steak", "Ribeye", 3400, 1], ["cake", "Carrot Cake", 900, 1]]), // 4300
      order(new Date(2026, 2, 10, 14), [["steak", "Ribeye", 3400, 1]]), // 3400, no AR dish
    ];
    const events = [
      ev("cake", "ar_launch", new Date(2026, 2, 10, 11)),
      ev("cake", "ar_launch", new Date(2026, 2, 10, 11, 5)),
      ev("cake", "ar_launch", new Date(2026, 2, 10, 11, 9)),
      ev("cake", "ar_launch", new Date(2026, 2, 10, 11, 12)),
      ev("cake", "view", new Date(2026, 2, 10, 11, 1)),
    ];
    const k = computeKpis(orders, events, new Set(["cake"]));
    expect(k.revenueCents).toBe(9500);
    expect(k.orderCount).toBe(3);
    expect(k.avgOrderCents).toBe(Math.round(9500 / 3));
    // 2 orders contain the AR dish / 4 AR launches
    expect(k.arConversion).toBeCloseTo(0.5);
  });
  it("returns null AR conversion when there were no AR launches", () => {
    const orders = [order(new Date(2026, 2, 10, 12), [["cake", "Carrot Cake", 900, 1]])];
    expect(computeKpis(orders, [], new Set(["cake"])).arConversion).toBeNull();
  });
});

describe("revenueByDay", () => {
  it("fills every day of the range, including empty ones", () => {
    const range = periodRange("7d", NOW);
    const orders = [
      order(new Date(2026, 2, 10, 12), [["cake", "Carrot Cake", 900, 1]]),
      order(new Date(2026, 2, 10, 13), [["cake", "Carrot Cake", 900, 2]]),
      order(new Date(2026, 2, 6, 19), [["steak", "Ribeye", 3400, 1]]),
    ];
    const rows = revenueByDay(orders, range);
    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual({ date: "2026-03-04", revenueCents: 0, orders: 0 });
    expect(rows.find((r) => r.date === "2026-03-06")).toEqual({ date: "2026-03-06", revenueCents: 3400, orders: 1 });
    expect(rows[6]).toEqual({ date: "2026-03-10", revenueCents: 2700, orders: 2 });
  });
  it("returns zero rows for empty data", () => {
    const rows = revenueByDay([], periodRange("today", NOW));
    expect(rows).toEqual([{ date: "2026-03-10", revenueCents: 0, orders: 0 }]);
  });
});

describe("ordersByHour", () => {
  it("always returns 24 buckets", () => {
    const rows = ordersByHour([]);
    expect(rows).toHaveLength(24);
    expect(rows.every((r) => r.orders === 0)).toBe(true);
  });
  it("buckets by local hour", () => {
    const rows = ordersByHour([
      order(new Date(2026, 2, 10, 12, 5), [["cake", "Carrot Cake", 900, 1]]),
      order(new Date(2026, 2, 10, 12, 55), [["cake", "Carrot Cake", 900, 1]]),
      order(new Date(2026, 2, 10, 19, 0), [["cake", "Carrot Cake", 900, 1]]),
    ]);
    expect(rows[12].orders).toBe(2);
    expect(rows[19].orders).toBe(1);
  });
});

describe("topDishes", () => {
  it("ranks by units, then revenue, then name, and respects the limit", () => {
    const orders = [
      order(new Date(2026, 2, 10, 12), [["cake", "Carrot Cake", 900, 3], ["steak", "Ribeye", 3400, 3]]),
      order(new Date(2026, 2, 10, 13), [["tea", "Tea", 300, 1]]),
    ];
    const top = topDishes(orders, 2);
    expect(top.map((t) => t.dishId)).toEqual(["steak", "cake"]);
    expect(top[0]).toEqual({ dishId: "steak", name: "Ribeye", quantity: 3, revenueCents: 10200 });
  });
  it("returns an empty list for no orders", () => {
    expect(topDishes([], 5)).toEqual([]);
  });
});

describe("categoryMix", () => {
  it("shares revenue by category and groups deleted dishes as Otros", () => {
    const orders = [
      order(new Date(2026, 2, 10, 12), [
        ["cake", "Carrot Cake", 1000, 1],
        ["steak", "Ribeye", 3000, 1],
        ["gone", "Old Dish", 1000, 1],
      ]),
    ];
    const mix = categoryMix(orders, dishes, categories);
    expect(mix.map((m) => m.name)).toEqual(["Mains", "Desserts", "Otros"]);
    expect(mix[0].share).toBeCloseTo(0.6);
    expect(mix.reduce((s, m) => s + m.share, 0)).toBeCloseTo(1);
  });
  it("returns an empty list when there is no revenue", () => {
    expect(categoryMix([], dishes, categories)).toEqual([]);
  });
});

describe("dishPerformance", () => {
  it("combines views, AR launches, orders, revenue and conversion for every dish", () => {
    const orders = [
      order(new Date(2026, 2, 10, 12), [["cake", "Carrot Cake", 900, 2]]),
      order(new Date(2026, 2, 10, 13), [["cake", "Carrot Cake", 900, 1]]),
    ];
    const events = [
      ev("cake", "view", new Date(2026, 2, 10, 9)),
      ev("cake", "view", new Date(2026, 2, 10, 10)),
      ev("cake", "view", new Date(2026, 2, 10, 11)),
      ev("cake", "view", new Date(2026, 2, 10, 11, 30)),
      ev("cake", "ar_launch", new Date(2026, 2, 10, 11)),
    ];
    const rows = dishPerformance(orders, events, dishes);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      dishId: "cake",
      name: "Carrot Cake",
      hasModel: true,
      views: 4,
      arLaunches: 1,
      orders: 2,
      unitsSold: 3,
      revenueCents: 2700,
      conversion: 0.5,
    });
    expect(rows[1]).toMatchObject({ dishId: "steak", views: 0, orders: 0, revenueCents: 0, conversion: null });
  });
});

describe("buildDashboard", () => {
  it("returns current/previous KPIs with deltas for a period", () => {
    const orders = [
      order(new Date(2026, 2, 10, 12), [["cake", "Carrot Cake", 1000, 2]]), // today 2000
      order(new Date(2026, 2, 10, 13), [["steak", "Ribeye", 3000, 1]]), // today 3000
      order(new Date(2026, 2, 9, 13), [["steak", "Ribeye", 2500, 1]]), // yesterday 2500
    ];
    const data = buildDashboard({ orders, events: [], dishes, categories }, "today", NOW);
    expect(data.current.revenueCents).toBe(5000);
    expect(data.previous.revenueCents).toBe(2500);
    expect(data.deltas.revenue).toBeCloseTo(100);
    expect(data.deltas.orders).toBeCloseTo(100);
    expect(data.revenueByDay).toHaveLength(1);
    expect(data.ordersByHour).toHaveLength(24);
    expect(data.topDishes[0].dishId).toBe("cake"); // 2 units beat 1 unit
  });
  it("is safe on completely empty data", () => {
    const data = buildDashboard({ orders: [], events: [], dishes: [], categories: [] }, "30d", NOW);
    expect(data.current.revenueCents).toBe(0);
    expect(data.deltas.revenue).toBe(0);
    expect(data.revenueByDay).toHaveLength(30);
    expect(data.topDishes).toEqual([]);
    expect(data.categoryMix).toEqual([]);
    expect(data.dishPerformance).toEqual([]);
  });
});
