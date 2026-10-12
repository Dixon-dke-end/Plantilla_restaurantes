import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, resetTestDb } from "@/server/db/testing";
import type { DbHandle } from "@/server/db/client";
import { categories, dishes, user } from "@/server/db/schema";
import { NotFoundError, UnprocessableError } from "@/shared/lib/appErrors";
import { DrizzleOrderRepository } from "./drizzleOrderRepository";
import { InProcessOrderEventBus } from "../events/inProcessBus";
import { InvalidTransitionError } from "../../domain/status";
import type { OrderChangeEvent } from "../../domain/events";

let handle: DbHandle;
beforeAll(async () => {
  handle = await createTestDb();
}, 60_000);
afterAll(async () => {
  await handle.close();
});

let bus: InProcessOrderEventBus;
let repo: DrizzleOrderRepository;
let events: OrderChangeEvent[];

beforeEach(async () => {
  await resetTestDb(handle);
  await handle.db.insert(categories).values({ id: "c1", name: "Mains", slug: "mains", sort: 1 });
  await handle.db.insert(dishes).values([
    { id: "a", slug: "a", name: "Dish A", priceCents: 1000, categoryId: "c1" },
    { id: "b", slug: "b", name: "Dish B", priceCents: 2500, categoryId: "c1" },
    { id: "gone", slug: "gone", name: "Gone", priceCents: 700, categoryId: "c1", isAvailable: false },
  ]);
  await handle.db.insert(user).values({ id: "u1", name: "Staff", email: "s@x.test", role: "employee" });
  bus = new InProcessOrderEventBus();
  events = [];
  bus.subscribe((e) => events.push(e));
  repo = new DrizzleOrderRepository({ db: handle.db, bus });
});

const cmd = (overrides = {}) => ({
  items: [
    { dishId: "a", quantity: 2 },
    { dishId: "b", quantity: 1, notes: "no salt" },
  ],
  tableLabel: "Table 4",
  customerName: "Ana",
  notes: "",
  source: "customer" as const,
  ...overrides,
});

describe("DrizzleOrderRepository.place", () => {
  it("computes prices from the database catalog, never from the client", async () => {
    const tampered = cmd({ items: [{ dishId: "a", quantity: 2, unitPriceCents: 1, priceCents: 1 }] });
    const placed = await repo.place(tampered);
    const order = (await repo.getPublic(placed.id))!;
    expect(order.items[0].unitPriceCents).toBe(1000);
    expect(order.totalCents).toBe(2000);
  });

  it("snapshots names and notes, totals every line and starts pending", async () => {
    const placed = await repo.place(cmd());
    const order = (await repo.getPublic(placed.id))!;
    expect(order.totalCents).toBe(2 * 1000 + 2500);
    expect(order.items.map((i) => i.dishName)).toEqual(["Dish A", "Dish B"]);
    expect(order.items[1].notes).toBe("no salt");
    expect(order.status).toBe("pending");
  });

  it("assigns sequential human codes", async () => {
    const a = await repo.place(cmd());
    const b = await repo.place(cmd());
    expect([a.code, b.code]).toEqual(["A-001", "A-002"]);
  });

  it("rejects unavailable and unknown dishes and writes nothing", async () => {
    await expect(repo.place(cmd({ items: [{ dishId: "gone", quantity: 1 }] }))).rejects.toThrow(UnprocessableError);
    await expect(repo.place(cmd({ items: [{ dishId: "zzz", quantity: 1 }] }))).rejects.toThrow(UnprocessableError);
    expect(await repo.list()).toEqual([]);
  });

  it("rejects empty orders and bad quantities", async () => {
    await expect(repo.place(cmd({ items: [] }))).rejects.toThrow(UnprocessableError);
    await expect(repo.place(cmd({ items: [{ dishId: "a", quantity: 0 }] }))).rejects.toThrow(UnprocessableError);
  });

  it("stores the staff user who created a staff order", async () => {
    const placed = await repo.place(cmd({ source: "staff", createdBy: "u1" }));
    const order = (await repo.list())[0];
    expect(order.id).toBe(placed.id);
    expect(order.source).toBe("staff");
    expect(order.createdBy).toBe("u1");
  });

  it("publishes a 'created' event", async () => {
    const placed = await repo.place(cmd());
    expect(events).toEqual([expect.objectContaining({ type: "created", orderId: placed.id, status: "pending" })]);
  });
});

describe("DrizzleOrderRepository reads", () => {
  it("getPublic returns null for unknown ids and hides private fields", async () => {
    expect(await repo.getPublic("nope")).toBeNull();
    const placed = await repo.place(cmd());
    const pub = (await repo.getPublic(placed.id))! as Record<string, unknown>;
    expect(pub.customerName).toBeUndefined();
    expect(pub.createdBy).toBeUndefined();
    expect(pub.notes).toBeUndefined();
  });

  it("lists newest first with items and supports filters", async () => {
    const first = await repo.place(cmd());
    await new Promise((r) => setTimeout(r, 15));
    const cutoff = new Date();
    await new Promise((r) => setTimeout(r, 15));
    const second = await repo.place(cmd());
    const all = await repo.list();
    expect(all.map((o) => o.id)).toEqual([second.id, first.id]);
    expect(all[0].items).toHaveLength(2);
    await repo.updateStatus(first.id, "preparing");
    expect((await repo.list({ statuses: ["preparing"] })).map((o) => o.id)).toEqual([first.id]);
    expect((await repo.list({ from: cutoff })).map((o) => o.id)).toEqual([second.id]);
    expect((await repo.list({ to: cutoff })).map((o) => o.id)).toEqual([first.id]);
  });
});

describe("DrizzleOrderRepository.updateStatus", () => {
  it("walks the state machine and stamps timestamps", async () => {
    const placed = await repo.place(cmd());
    const preparing = await repo.updateStatus(placed.id, "preparing");
    expect(preparing.preparingAt).not.toBeNull();
    const ready = await repo.updateStatus(placed.id, "ready");
    expect(ready.readyAt).not.toBeNull();
    const served = await repo.updateStatus(placed.id, "served");
    expect(served.servedAt).not.toBeNull();
    expect(served.status).toBe("served");
  });

  it("clears later timestamps when stepping back", async () => {
    const placed = await repo.place(cmd());
    await repo.updateStatus(placed.id, "preparing");
    await repo.updateStatus(placed.id, "ready");
    const back = await repo.updateStatus(placed.id, "preparing");
    expect(back.readyAt).toBeNull();
    expect(back.preparingAt).not.toBeNull();
  });

  it("rejects invalid transitions and unknown orders", async () => {
    const placed = await repo.place(cmd());
    await expect(repo.updateStatus(placed.id, "served")).rejects.toBeInstanceOf(InvalidTransitionError);
    await expect(repo.updateStatus("missing", "preparing")).rejects.toThrow(NotFoundError);
  });

  it("stamps cancelledAt and publishes an 'updated' event", async () => {
    const placed = await repo.place(cmd());
    events.length = 0;
    const cancelled = await repo.updateStatus(placed.id, "cancelled");
    expect(cancelled.cancelledAt).not.toBeNull();
    expect(events).toEqual([expect.objectContaining({ type: "updated", orderId: placed.id, status: "cancelled" })]);
  });

  it("forwards subscriptions to the event bus", async () => {
    const onChange = vi.fn();
    const off = repo.subscribe(onChange);
    await repo.place(cmd());
    expect(onChange).toHaveBeenCalledTimes(1);
    off();
    await repo.place(cmd());
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
