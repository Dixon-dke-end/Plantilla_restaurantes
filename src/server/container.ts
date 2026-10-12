import { DiskMediaStorage } from "@/modules/menu/infrastructure/disk/diskMediaStorage";
import { DrizzleCategoryRepository, DrizzleDishRepository } from "@/modules/menu/infrastructure/drizzle/drizzleMenu";
import { DrizzleAnalyticsRepository } from "@/modules/analytics/infrastructure/drizzle/drizzleAnalyticsRepository";
import type { OrderEventBus } from "@/modules/orders/domain/events";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle/drizzleOrderRepository";
import { InProcessOrderEventBus } from "@/modules/orders/infrastructure/events/inProcessBus";
import { PgNotifyOrderEventBus } from "@/modules/orders/infrastructure/events/pgNotifyBus";
import { createPgTransport } from "@/modules/orders/infrastructure/events/pgTransport";
import { getDbHandle, type Db } from "./db/client";

export type Container = {
  db: Db;
  dishes: DrizzleDishRepository;
  categories: DrizzleCategoryRepository;
  orders: DrizzleOrderRepository;
  analytics: DrizzleAnalyticsRepository;
  media: DiskMediaStorage;
  bus: OrderEventBus;
};

type Globals = typeof globalThis & { __emberContainer?: Promise<Container> };

async function createContainer(): Promise<Container> {
  const handle = await getDbHandle();
  await handle.migrate(); // idempotent; also done at boot by instrumentation.ts

  const bus: OrderEventBus =
    handle.driver === "pg" && handle.pool && process.env.DATABASE_URL
      ? new PgNotifyOrderEventBus(createPgTransport(handle.pool, process.env.DATABASE_URL))
      : new InProcessOrderEventBus();

  return {
    db: handle.db,
    dishes: new DrizzleDishRepository(handle.db),
    categories: new DrizzleCategoryRepository(handle.db),
    orders: new DrizzleOrderRepository({ db: handle.db, bus }),
    analytics: new DrizzleAnalyticsRepository(handle.db),
    media: new DiskMediaStorage({ dir: process.env.UPLOAD_DIR ?? "./.data/uploads" }),
    bus,
  };
}

/** Composition root for the server: one container per process (shared across route bundles). */
export function getContainer(): Promise<Container> {
  const g = globalThis as Globals;
  g.__emberContainer ??= createContainer();
  return g.__emberContainer;
}
