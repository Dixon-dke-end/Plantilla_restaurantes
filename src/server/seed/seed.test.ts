import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { count } from "drizzle-orm";
import { createTestDb, resetTestDb } from "@/server/db/testing";
import type { DbHandle } from "@/server/db/client";
import { categories, dishEvents, dishes, orders, user } from "@/server/db/schema";
import { InProcessOrderEventBus } from "@/modules/orders/infrastructure/events/inProcessBus";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle/drizzleOrderRepository";
import { seedDatabase } from "./seed";

let handle: DbHandle;
beforeAll(async () => {
  handle = await createTestDb();
}, 60_000);
afterAll(async () => {
  await handle.close();
});
beforeEach(async () => {
  await resetTestDb(handle);
});

const staff = [
  { email: "admin@x.test", password: "admin password 123", fullName: "Admin", role: "admin" as const },
  { email: "staff@x.test", password: "staff password 123", fullName: "Staff", role: "employee" as const },
];
const NOW = new Date(2026, 2, 10, 15, 0, 0);

const counts = async () => {
  const [c] = await handle.db.select({ n: count() }).from(categories);
  const [d] = await handle.db.select({ n: count() }).from(dishes);
  const [o] = await handle.db.select({ n: count() }).from(orders);
  const [e] = await handle.db.select({ n: count() }).from(dishEvents);
  const [u] = await handle.db.select({ n: count() }).from(user);
  return { categories: c.n, dishes: d.n, orders: o.n, events: e.n, users: u.n };
};

describe("seedDatabase", () => {
  it("seeds catalog and staff without demo history when disabled", async () => {
    await seedDatabase(handle.db, { staff, includeDemoData: false, now: NOW });
    const c = await counts();
    expect(c.categories).toBe(5);
    expect(c.dishes).toBe(12);
    expect(c.users).toBe(2);
    expect(c.orders).toBe(0);
    expect(c.events).toBe(0);
  });

  it("adds ~30 days of orders and dish events when demo data is enabled", async () => {
    await seedDatabase(handle.db, { staff, includeDemoData: true, now: NOW });
    const c = await counts();
    expect(c.orders).toBeGreaterThan(300);
    expect(c.events).toBeGreaterThan(1000);
  });

  it("is idempotent", async () => {
    await seedDatabase(handle.db, { staff, includeDemoData: true, now: NOW });
    const first = await counts();
    await seedDatabase(handle.db, { staff, includeDemoData: true, now: NOW });
    expect(await counts()).toEqual(first);
  });

  it("keeps order codes unique after seeding history", async () => {
    await seedDatabase(handle.db, { staff, includeDemoData: true, now: NOW });
    const repo = new DrizzleOrderRepository({ db: handle.db, bus: new InProcessOrderEventBus() });
    const [first] = await handle.db.select().from(dishes).limit(1);
    const placed = await repo.place({
      items: [{ dishId: first.id, quantity: 1 }],
      tableLabel: "Mesa 1",
      customerName: "",
      notes: "",
      source: "customer",
    });
    const all = await repo.list();
    const codes = new Set(all.map((o) => o.code));
    expect(codes.size).toBe(all.length);
    expect(placed.code).toBe(all[0].code);
  });

  it("does not overwrite an existing staff password on re-seed", async () => {
    await seedDatabase(handle.db, { staff, includeDemoData: false, now: NOW });
    await seedDatabase(handle.db, {
      staff: [{ ...staff[0], password: "a different password 1" }],
      includeDemoData: false,
      now: NOW,
    });
    expect((await counts()).users).toBe(2);
  });
});
