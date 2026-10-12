import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type DbHandle = {
  db: Db;
  driver: "pg" | "pglite";
  /** Present for the node-postgres driver (used for LISTEN/NOTIFY). */
  pool?: import("pg").Pool;
  /** Applies pending SQL migrations from the `drizzle/` folder. */
  migrate(): Promise<void>;
  close(): Promise<void>;
};

export const migrationsFolder = () => process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), "drizzle");

export async function createPgDb(connectionString: string): Promise<DbHandle> {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const pool = new Pool({ connectionString, max: Number(process.env.DATABASE_POOL_MAX ?? 10) });
  const db = drizzle(pool, { schema });
  return {
    db: db as unknown as Db,
    driver: "pg",
    pool,
    migrate: () => migrate(db, { migrationsFolder: migrationsFolder() }),
    close: () => pool.end(),
  };
}

/** Embedded Postgres (WASM). `dataDir` undefined = in-memory (tests). */
export async function createPgliteDb(dataDir?: string): Promise<DbHandle> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dataDir) {
    const fs = await import("node:fs/promises");
    await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(dataDir), { recursive: true });
  }
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  return {
    db: db as unknown as Db,
    driver: "pglite",
    migrate: () => migrate(db, { migrationsFolder: migrationsFolder() }),
    close: () => client.close(),
  };
}

type Globals = typeof globalThis & { __emberDb?: Promise<DbHandle> };

/**
 * Process-wide handle (survives Next.js dev HMR and separate route bundles).
 * DATABASE_URL -> PostgreSQL; otherwise embedded PGlite persisted in ./.data/pglite.
 */
export function getDbHandle(): Promise<DbHandle> {
  const g = globalThis as Globals;
  g.__emberDb ??= process.env.DATABASE_URL
    ? createPgDb(process.env.DATABASE_URL)
    : createPgliteDb(path.resolve(/*turbopackIgnore: true*/ process.env.PGLITE_DIR ?? "./.data/pglite"));
  return g.__emberDb;
}

export async function getDb(): Promise<Db> {
  return (await getDbHandle()).db;
}
