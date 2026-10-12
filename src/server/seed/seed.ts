import { count, eq, sql } from "drizzle-orm";
import type { NewTeamMember } from "@/modules/auth/domain/types";
import type { Db } from "@/server/db/client";
import { categories, dishEvents, dishes, orderItems, orders, user } from "@/server/db/schema";
import { createTeamMember } from "@/server/auth/team";
import { DEMO_CATEGORIES, DEMO_DISHES } from "./catalog";
import { generateDemoHistory } from "./history";

export type SeedOptions = {
  /** Staff accounts to create when the email does not exist yet (existing accounts are left alone). */
  staff: NewTeamMember[];
  /** Insert ~30 days of synthetic orders and dish events (only into an empty orders table). */
  includeDemoData: boolean;
  now?: Date;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/** Idempotent: safe to run on every deploy. Never overwrites rows an admin may have edited. */
export async function seedDatabase(db: Db, options: SeedOptions): Promise<void> {
  const now = options.now ?? new Date();

  await db.insert(categories).values(DEMO_CATEGORIES).onConflictDoNothing();
  await db
    .insert(dishes)
    .values(
      DEMO_DISHES.map((d) => ({
        ...d,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt),
      })),
    )
    .onConflictDoNothing();

  for (const member of options.staff) {
    const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, member.email.toLowerCase())).limit(1);
    if (!existing) await createTeamMember(db, member);
  }

  if (!options.includeDemoData) return;
  const [{ n }] = await db.select({ n: count() }).from(orders);
  if (n > 0) return;

  const history = generateDemoHistory({ dishes: DEMO_DISHES, now });

  for (const batch of chunk(history.orders, 250)) {
    await db.insert(orders).values(
      batch.map((o, i) => ({
        id: o.id,
        seq: Number(o.id.replace("demo-order-", "")) || i + 1,
        status: o.status,
        source: o.source,
        tableLabel: o.tableLabel,
        customerName: o.customerName,
        notes: o.notes,
        totalCents: o.totalCents,
        createdBy: null,
        createdAt: new Date(o.createdAt),
        updatedAt: new Date(o.updatedAt),
        preparingAt: o.preparingAt ? new Date(o.preparingAt) : null,
        readyAt: o.readyAt ? new Date(o.readyAt) : null,
        servedAt: o.servedAt ? new Date(o.servedAt) : null,
        cancelledAt: o.cancelledAt ? new Date(o.cancelledAt) : null,
      })),
    );
  }

  const items = history.orders.flatMap((o) =>
    o.items.map((item, position) => ({
      id: `${o.id}-${position}`,
      orderId: o.id,
      dishId: item.dishId,
      dishName: item.dishName,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      notes: item.notes,
      position,
    })),
  );
  for (const batch of chunk(items, 500)) await db.insert(orderItems).values(batch);

  for (const batch of chunk(history.events, 2000)) {
    await db.insert(dishEvents).values(
      batch.map((e) => ({ dishId: e.dishId, kind: e.kind, createdAt: new Date(e.createdAt) })),
    );
  }

  // Rows were inserted with explicit sequence numbers: move the identity past them.
  await db.execute(sql`select setval(pg_get_serial_sequence('orders', 'seq'), (select max(seq) from orders))`);
}
