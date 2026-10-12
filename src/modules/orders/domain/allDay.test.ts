import { describe, expect, it } from "vitest";
import { allDayCounts } from "./allDay";
import type { Order } from "./types";

function order(status: Order["status"], items: Array<[string, string, number]>): Order {
  return {
    id: Math.random().toString(36),
    code: "A-001",
    status,
    source: "customer",
    tableLabel: "Table 1",
    customerName: "",
    notes: "",
    totalCents: 0,
    createdBy: null,
    createdAt: "2026-03-10T12:00:00Z",
    updatedAt: "2026-03-10T12:00:00Z",
    preparingAt: null,
    readyAt: null,
    servedAt: null,
    cancelledAt: null,
    items: items.map(([dishId, dishName, quantity]) => ({
      dishId,
      dishName,
      unitPriceCents: 100,
      quantity,
      notes: "",
    })),
  };
}

describe("allDayCounts", () => {
  it("sums quantities per dish across open tickets", () => {
    const counts = allDayCounts([
      order("pending", [["a", "Ribeye", 2], ["b", "Salad", 1]]),
      order("preparing", [["a", "Ribeye", 1]]),
    ]);
    expect(counts).toEqual([
      { dishId: "a", dishName: "Ribeye", quantity: 3 },
      { dishId: "b", dishName: "Salad", quantity: 1 },
    ]);
  });

  it("ignores ready, served and cancelled tickets", () => {
    const counts = allDayCounts([
      order("ready", [["a", "Ribeye", 5]]),
      order("served", [["a", "Ribeye", 5]]),
      order("cancelled", [["a", "Ribeye", 5]]),
    ]);
    expect(counts).toEqual([]);
  });

  it("sorts by quantity then name", () => {
    const counts = allDayCounts([
      order("pending", [["b", "Burger", 2], ["a", "Avocado", 2], ["c", "Cake", 5]]),
    ]);
    expect(counts.map((c) => c.dishName)).toEqual(["Cake", "Avocado", "Burger"]);
  });
});
