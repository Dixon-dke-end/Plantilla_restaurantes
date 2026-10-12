import { asc, gte } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { dishEvents } from "@/server/db/schema";
import type { AnalyticsRepository } from "../../domain/ports";
import type { DishEvent, DishEventKind } from "../../domain/types";

export class DrizzleAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly db: Db) {}

  async trackDishEvent(dishId: string, kind: DishEventKind): Promise<void> {
    // Analytics must never break the customer flow (unknown dish ids violate the FK and are dropped).
    try {
      await this.db.insert(dishEvents).values({ dishId, kind });
    } catch {
      /* ignore */
    }
  }

  async listDishEvents(since: Date): Promise<DishEvent[]> {
    const rows = await this.db
      .select()
      .from(dishEvents)
      .where(gte(dishEvents.createdAt, since))
      .orderBy(asc(dishEvents.createdAt), asc(dishEvents.id))
      .limit(100_000);
    return rows.map((r) => ({ dishId: r.dishId, kind: r.kind as DishEventKind, createdAt: r.createdAt.toISOString() }));
  }
}
