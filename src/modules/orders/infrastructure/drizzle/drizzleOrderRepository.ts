import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { NotFoundError, UnprocessableError } from "@/shared/lib/appErrors";
import { newId } from "@/shared/lib/id";
import type { Db } from "@/server/db/client";
import { dishes, orderItems, orders } from "@/server/db/schema";
import { formatOrderCode } from "../../domain/code";
import type { OrderChangeEvent, OrderEventBus } from "../../domain/events";
import type { OrderRepository, Unsubscribe } from "../../domain/ports";
import { assertTransition } from "../../domain/status";
import type {
  Order,
  OrderFilter,
  OrderItem,
  OrderStatus,
  PlaceOrderCommand,
  PlacedOrder,
  PublicOrder,
} from "../../domain/types";

type OrderRow = typeof orders.$inferSelect;
type ItemRow = typeof orderItems.$inferSelect;

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function mapItemRow(row: ItemRow): OrderItem {
  return {
    dishId: row.dishId ?? "",
    dishName: row.dishName,
    unitPriceCents: row.unitPriceCents,
    quantity: row.quantity,
    notes: row.notes,
  };
}

export function mapOrderRow(row: OrderRow, items: ItemRow[]): Order {
  return {
    id: row.id,
    code: formatOrderCode(row.seq),
    status: row.status,
    source: row.source,
    tableLabel: row.tableLabel,
    customerName: row.customerName,
    notes: row.notes,
    totalCents: row.totalCents,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    preparingAt: iso(row.preparingAt),
    readyAt: iso(row.readyAt),
    servedAt: iso(row.servedAt),
    cancelledAt: iso(row.cancelledAt),
    items: [...items].sort((a, b) => a.position - b.position).map(mapItemRow),
  };
}

export type DrizzleOrderRepositoryDeps = { db: Db; bus: OrderEventBus };

/**
 * Postgres-backed orders. Authorization (who may list/update/create staff orders) is enforced by the
 * route handlers; this class is the trust boundary for *data* integrity: prices always come from the
 * dishes table and status changes always go through the state machine.
 */
export class DrizzleOrderRepository implements OrderRepository {
  constructor(private readonly deps: DrizzleOrderRepositoryDeps) {}

  private publish(type: OrderChangeEvent["type"], order: { id: string; status: OrderStatus }) {
    const event: OrderChangeEvent = { type, orderId: order.id, status: order.status, at: new Date().toISOString() };
    // Realtime is best-effort: never fail the write because a notification could not be delivered.
    return this.deps.bus.publish(event).catch(() => undefined);
  }

  async place(command: PlaceOrderCommand): Promise<PlacedOrder> {
    if (command.items.length === 0) throw new UnprocessableError("El pedido está vacío.");
    for (const line of command.items) {
      if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) {
        throw new UnprocessableError("La cantidad debe ser un número entero entre 1 y 99.");
      }
    }

    const { db } = this.deps;
    const placed = await db.transaction(async (tx) => {
      const ids = [...new Set(command.items.map((i) => i.dishId))];
      const catalog = new Map((await tx.select().from(dishes).where(inArray(dishes.id, ids))).map((d) => [d.id, d]));

      const lines = command.items.map((line, position) => {
        const dish = catalog.get(line.dishId);
        if (!dish || !dish.isAvailable) throw new UnprocessableError(`${dish?.name ?? "Un plato"} ya no está disponible.`);
        return {
          id: newId(),
          dishId: dish.id,
          dishName: dish.name,
          unitPriceCents: dish.priceCents,
          quantity: line.quantity,
          notes: (line.notes ?? "").trim(),
          position,
        };
      });

      const [order] = await tx
        .insert(orders)
        .values({
          id: newId(),
          source: command.source,
          tableLabel: command.tableLabel,
          customerName: command.customerName,
          notes: command.notes,
          totalCents: lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0),
          createdBy: command.source === "staff" ? (command.createdBy ?? null) : null,
        })
        .returning();
      await tx.insert(orderItems).values(lines.map((l) => ({ ...l, orderId: order.id })));
      return order;
    });

    await this.publish("created", placed);
    return { id: placed.id, code: formatOrderCode(placed.seq) };
  }

  private async loadItems(orderIds: string[]): Promise<Map<string, ItemRow[]>> {
    const map = new Map<string, ItemRow[]>();
    if (orderIds.length === 0) return map;
    const rows = await this.deps.db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
    for (const row of rows) map.set(row.orderId, [...(map.get(row.orderId) ?? []), row]);
    return map;
  }

  async getPublic(id: string): Promise<PublicOrder | null> {
    const [row] = await this.deps.db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!row) return null;
    const items = (await this.loadItems([row.id])).get(row.id) ?? [];
    const order = mapOrderRow(row, items);
    return {
      id: order.id,
      code: order.code,
      status: order.status,
      tableLabel: order.tableLabel,
      totalCents: order.totalCents,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      preparingAt: order.preparingAt,
      readyAt: order.readyAt,
      servedAt: order.servedAt,
      cancelledAt: order.cancelledAt,
      items: order.items,
    };
  }

  async list(filter: OrderFilter = {}): Promise<Order[]> {
    const conditions = [
      filter.statuses?.length ? inArray(orders.status, filter.statuses) : undefined,
      filter.from ? gte(orders.createdAt, filter.from) : undefined,
      filter.to ? lte(orders.createdAt, filter.to) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const rows = await this.deps.db
      .select()
      .from(orders)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(orders.createdAt), desc(orders.seq))
      .limit(5000);
    const items = await this.loadItems(rows.map((r) => r.id));
    return rows.map((r) => mapOrderRow(r, items.get(r.id) ?? []));
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const updated = await this.deps.db.transaction(async (tx) => {
      const [current] = await tx.select().from(orders).where(eq(orders.id, id)).for("update").limit(1);
      if (!current) throw new NotFoundError("No se encontró el pedido.");
      assertTransition(current.status, status);

      const now = new Date();
      const patch: Partial<typeof orders.$inferInsert> = { status, updatedAt: now };
      if (status === "pending") patch.preparingAt = null;
      if (status === "preparing") {
        patch.preparingAt = now;
        patch.readyAt = null;
      }
      if (status === "ready") patch.readyAt = now;
      if (status === "served") patch.servedAt = now;
      if (status === "cancelled") patch.cancelledAt = now;

      const [row] = await tx.update(orders).set(patch).where(eq(orders.id, id)).returning();
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id));
      return mapOrderRow(row, items);
    });
    await this.publish("updated", updated);
    return updated;
  }

  subscribe(onChange: () => void): Unsubscribe {
    return this.deps.bus.subscribe(() => onChange());
  }
}
