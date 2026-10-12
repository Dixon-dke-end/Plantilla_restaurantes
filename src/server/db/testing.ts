import { sql } from "drizzle-orm";
import { createPgliteDb, type DbHandle } from "./client";

/** In-memory PGlite with all migrations applied. For tests only. */
export async function createTestDb(): Promise<DbHandle> {
  const handle = await createPgliteDb();
  await handle.migrate();
  return handle;
}

export async function resetTestDb(handle: DbHandle): Promise<void> {
  await handle.db.execute(
    sql`truncate table order_items, orders, dish_events, dishes, categories, session, account, verification, "user" restart identity cascade`,
  );
}
