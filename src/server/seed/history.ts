import { addDays, MINUTE_MS, startOfDay } from "@/shared/lib/dates";
import { mulberry32, pickWeighted, randInt } from "@/shared/lib/prng";
import type { DishEvent } from "@/modules/analytics/domain/types";
import type { Dish } from "@/modules/menu/domain/types";
import { formatOrderCode } from "@/modules/orders/domain/code";
import { PICKUP_LABEL, TABLE_PREFIX } from "@/modules/orders/domain/fulfillment";
import type { Order, OrderItem, OrderStatus } from "@/modules/orders/domain/types";

export type DemoHistory = {
  orders: Order[];
  events: DishEvent[];
  /** Highest order sequence number used. */
  lastSeq: number;
};

const HISTORY_DAYS = 30;
/** Weekday multipliers, Sunday first. */
const DOW_FACTOR = [0.95, 0.7, 0.75, 0.85, 1.0, 1.35, 1.5];
/** Relative demand per opening hour (11:00-21:59). */
const HOURS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const HOUR_WEIGHTS = [2, 6, 7, 4, 2, 1.5, 3, 6, 9, 8, 4];
const NAMES = ["Ana", "Luis", "Marta", "Diego", "Sofía", "Pablo", "Elena", "Mateo", "Lucía", "Andrés", "Carmen", "Javier"];
/** Today's history stops this long before "now"; the kitchen board gets explicit live orders instead. */
const LIVE_WINDOW_MIN = 35;

type DraftOrder = Omit<Order, "id" | "code">;

function buildItems(dishes: Dish[], weights: number[], rand: () => number): OrderItem[] {
  const count = pickWeighted([1, 2, 3, 4], [30, 35, 25, 10], rand);
  const chosen = new Set<string>();
  const items: OrderItem[] = [];
  let guard = 0;
  while (items.length < Math.min(count, dishes.length) && guard++ < 50) {
    const dish = pickWeighted(dishes, weights, rand);
    if (chosen.has(dish.id)) continue;
    chosen.add(dish.id);
    items.push({
      dishId: dish.id,
      dishName: dish.name,
      unitPriceCents: dish.priceCents,
      quantity: pickWeighted([1, 2, 3], [65, 28, 7], rand),
      notes: "",
    });
  }
  return items;
}

function makeDraft(
  at: Date,
  items: OrderItem[],
  status: OrderStatus,
  rand: () => number,
): DraftOrder {
  const isStaff = rand() < 0.25;
  const pickup = rand() < 0.22;
  const iso = (offsetMin: number) => new Date(at.getTime() + offsetMin * MINUTE_MS).toISOString();
  const preparingOffset = 2 + rand() * 3;
  const readyOffset = preparingOffset + 8 + rand() * 8;
  const servedOffset = readyOffset + 2 + rand() * 6;
  const reached = (s: OrderStatus) => ["pending", "preparing", "ready", "served"].indexOf(s);
  const level = status === "cancelled" ? 1 : reached(status);

  return {
    status,
    source: isStaff ? "staff" : "customer",
    tableLabel: pickup ? PICKUP_LABEL : `${TABLE_PREFIX} ${randInt(1, 16, rand)}`,
    customerName: pickup || rand() < 0.3 ? NAMES[randInt(0, NAMES.length - 1, rand)] : "",
    notes: "",
    totalCents: items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0),
    createdBy: isStaff ? "demo-staff" : null,
    createdAt: at.toISOString(),
    updatedAt: iso(status === "pending" ? 0 : status === "cancelled" ? preparingOffset : servedOffset),
    preparingAt: level >= 1 ? iso(preparingOffset) : null,
    readyAt: level >= 2 ? iso(readyOffset) : null,
    servedAt: level >= 3 ? iso(servedOffset) : null,
    cancelledAt: status === "cancelled" ? iso(preparingOffset) : null,
    items,
  };
}

/**
 * Deterministic synthetic history for the demo: ~30 days of orders with weekday/hour seasonality,
 * dish views / AR launches, and a handful of live tickets for the kitchen board.
 */
export function generateDemoHistory(params: { dishes: Dish[]; now: Date; seed?: number }): DemoHistory {
  const { dishes, now } = params;
  const rand = mulberry32(params.seed ?? 20260101);
  if (dishes.length === 0) return { orders: [], events: [], lastSeq: 0 };

  const weights = dishes.map((d) => (0.6 + rand() * 1.4) * (d.isFeatured ? 1.5 : 1));
  const today = startOfDay(now);
  const cutoff = now.getTime() - LIVE_WINDOW_MIN * MINUTE_MS;
  const drafts: DraftOrder[] = [];
  const ordersPerDishPerDay = new Map<string, number>();
  const bump = (day: string, dishId: string) => {
    const key = `${day}|${dishId}`;
    ordersPerDishPerDay.set(key, (ordersPerDishPerDay.get(key) ?? 0) + 1);
  };

  for (let offset = HISTORY_DAYS - 1; offset >= 0; offset--) {
    const day = addDays(today, -offset);
    const trend = 0.9 + 0.2 * ((HISTORY_DAYS - 1 - offset) / (HISTORY_DAYS - 1));
    const count = Math.round(22 * DOW_FACTOR[day.getDay()] * trend * (0.85 + rand() * 0.3));
    for (let n = 0; n < count; n++) {
      const hour = pickWeighted(HOURS, HOUR_WEIGHTS, rand);
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, randInt(0, 59, rand), randInt(0, 59, rand));
      if (at.getTime() > cutoff) continue;
      const items = buildItems(dishes, weights, rand);
      const status: OrderStatus = rand() < 0.06 ? "cancelled" : "served";
      drafts.push(makeDraft(at, items, status, rand));
      if (status !== "cancelled") for (const i of items) bump(day.toDateString(), i.dishId);
    }
  }

  // Live tickets on the kitchen board: ages in minutes and their current status.
  const live: Array<[number, OrderStatus]> = [
    [3, "pending"],
    [6, "pending"],
    [11, "preparing"],
    [17, "preparing"],
    [22, "ready"],
  ];
  for (const [age, status] of live) {
    const at = new Date(now.getTime() - age * MINUTE_MS);
    drafts.push(makeDraft(at, buildItems(dishes, weights, rand), status, rand));
  }

  drafts.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const orders: Order[] = drafts.map((d, i) => ({ ...d, id: `demo-order-${i + 1}`, code: formatOrderCode(i + 1) }));

  const events: DishEvent[] = [];
  const pushEvent = (dishId: string, kind: DishEvent["kind"], day: Date) => {
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), randInt(9, 21, rand), randInt(0, 59, rand), randInt(0, 59, rand));
    if (at.getTime() <= now.getTime()) events.push({ dishId, kind, createdAt: at.toISOString() });
  };
  for (let offset = HISTORY_DAYS - 1; offset >= 0; offset--) {
    const day = addDays(today, -offset);
    for (const dish of dishes) {
      const ordered = ordersPerDishPerDay.get(`${day.toDateString()}|${dish.id}`) ?? 0;
      const views = Math.round(ordered * (3 + rand() * 4)) + randInt(0, 3, rand);
      for (let v = 0; v < views; v++) pushEvent(dish.id, "view", day);
      if (dish.modelGlbUrl || dish.modelUsdzUrl) {
        const launches = Math.round(views * (0.28 + rand() * 0.2));
        for (let a = 0; a < launches; a++) pushEvent(dish.id, "ar_launch", day);
      }
    }
  }
  events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return { orders, events, lastSeq: orders.length };
}
