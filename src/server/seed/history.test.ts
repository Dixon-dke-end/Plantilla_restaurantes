import { describe, expect, it } from "vitest";
import { generateDemoHistory } from "./history";
import { formatOrderCode } from "@/modules/orders/domain/code";
import type { Dish } from "@/modules/menu/domain/types";

function dish(id: string, priceCents: number, hasModel: boolean): Dish {
  return {
    id,
    slug: id,
    name: `Dish ${id}`,
    description: "",
    priceCents,
    categoryId: "c1",
    imageUrl: null,
    modelGlbUrl: hasModel ? "https://example.com/m.glb" : null,
    modelUsdzUrl: null,
    diameterCm: hasModel ? 20 : null,
    heightCm: null,
    weightG: null,
    serves: null,
    modelScale: 1,
    allergens: [],
    isAvailable: true,
    isFeatured: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

const dishes = [dish("a", 1000, true), dish("b", 2200, false), dish("c", 650, true), dish("d", 1800, false)];
const NOW = new Date(2026, 2, 10, 15, 30, 0);

describe("generateDemoHistory", () => {
  const result = generateDemoHistory({ dishes, now: NOW, seed: 1234 });

  it("is deterministic for the same seed and clock", () => {
    const again = generateDemoHistory({ dishes, now: NOW, seed: 1234 });
    expect(again).toEqual(result);
    const other = generateDemoHistory({ dishes, now: NOW, seed: 99 });
    expect(other.orders.length).not.toBe(0);
    expect(other).not.toEqual(result);
  });

  it("covers about thirty days of history and never creates orders in the future", () => {
    const times = result.orders.map((o) => new Date(o.createdAt).getTime());
    expect(Math.max(...times)).toBeLessThanOrEqual(NOW.getTime());
    const earliest = new Date(Math.min(...times));
    expect(earliest.getTime()).toBeGreaterThanOrEqual(new Date(2026, 1, 9).getTime());
    expect(earliest.getTime()).toBeLessThan(new Date(2026, 1, 11).getTime());
    expect(result.orders.length).toBeGreaterThan(300);
  });

  it("assigns unique sequential codes in chronological order", () => {
    const chronological = [...result.orders].sort((x, y) => x.createdAt.localeCompare(y.createdAt));
    chronological.forEach((o, i) => expect(o.code).toBe(formatOrderCode(i + 1)));
    expect(result.lastSeq).toBe(result.orders.length);
  });

  it("builds consistent line items and totals from the catalog", () => {
    for (const o of result.orders.slice(0, 200)) {
      expect(o.items.length).toBeGreaterThan(0);
      const sum = o.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
      expect(o.totalCents).toBe(sum);
      for (const item of o.items) {
        expect(dishes.find((d) => d.id === item.dishId)?.priceCents).toBe(item.unitPriceCents);
      }
    }
  });

  it("leaves a few live orders on the kitchen board", () => {
    const live = result.orders.filter((o) => ["pending", "preparing", "ready"].includes(o.status));
    expect(live.length).toBeGreaterThanOrEqual(3);
    for (const o of live) {
      expect(NOW.getTime() - new Date(o.createdAt).getTime()).toBeLessThan(30 * 60_000);
    }
  });

  it("generates view events for all dishes and AR launches only for dishes with a model", () => {
    const kinds = new Set(result.events.map((e) => e.kind));
    expect(kinds).toEqual(new Set(["view", "ar_launch"]));
    const arDishes = new Set(result.events.filter((e) => e.kind === "ar_launch").map((e) => e.dishId));
    expect([...arDishes].sort()).toEqual(["a", "c"]);
    expect(result.events.every((e) => new Date(e.createdAt).getTime() <= NOW.getTime())).toBe(true);
  });
});
