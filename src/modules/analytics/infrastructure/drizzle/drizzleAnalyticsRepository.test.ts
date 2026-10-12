import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, resetTestDb } from "@/server/db/testing";
import type { DbHandle } from "@/server/db/client";
import { dishes } from "@/server/db/schema";
import { DrizzleAnalyticsRepository } from "./drizzleAnalyticsRepository";

let handle: DbHandle;
beforeAll(async () => {
  handle = await createTestDb();
}, 60_000);
afterAll(async () => {
  await handle.close();
});

beforeEach(async () => {
  await resetTestDb(handle);
  await handle.db.insert(dishes).values({ id: "a", slug: "a", name: "A", priceCents: 100 });
});

describe("DrizzleAnalyticsRepository", () => {
  it("records events and lists those since a date in chronological order", async () => {
    const repo = new DrizzleAnalyticsRepository(handle.db);
    await repo.trackDishEvent("a", "view");
    await new Promise((r) => setTimeout(r, 15));
    const cutoff = new Date();
    await new Promise((r) => setTimeout(r, 15));
    await repo.trackDishEvent("a", "ar_launch");
    const all = await repo.listDishEvents(new Date(0));
    expect(all.map((e) => e.kind)).toEqual(["view", "ar_launch"]);
    expect((await repo.listDishEvents(cutoff)).map((e) => e.kind)).toEqual(["ar_launch"]);
  });

  it("silently ignores events for unknown dishes (analytics must never break ordering)", async () => {
    const repo = new DrizzleAnalyticsRepository(handle.db);
    await expect(repo.trackDishEvent("missing", "view")).resolves.toBeUndefined();
    expect(await repo.listDishEvents(new Date(0))).toEqual([]);
  });
});
