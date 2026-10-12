import type { Order } from "./types";

export type AllDayCount = { dishId: string; dishName: string; quantity: number };

/** Quantities per dish across tickets that still need cooking (pending + preparing). */
export function allDayCounts(orders: Order[]): AllDayCount[] {
  const map = new Map<string, AllDayCount>();
  for (const order of orders) {
    if (order.status !== "pending" && order.status !== "preparing") continue;
    for (const item of order.items) {
      const entry = map.get(item.dishId) ?? { dishId: item.dishId, dishName: item.dishName, quantity: 0 };
      entry.quantity += item.quantity;
      map.set(item.dishId, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity || a.dishName.localeCompare(b.dishName));
}
