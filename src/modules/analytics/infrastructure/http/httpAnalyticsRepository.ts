import type { ApiClient } from "@/shared/lib/http";
import type { AnalyticsRepository } from "../../domain/ports";
import type { DishEvent, DishEventKind } from "../../domain/types";

export class HttpAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly api: ApiClient) {}

  async trackDishEvent(dishId: string, kind: DishEventKind): Promise<void> {
    // Fire-and-forget: tracking must never block or break the customer experience.
    try {
      await fetch("/api/dish-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dishId, kind }),
        keepalive: true,
      });
    } catch {
      /* ignore */
    }
  }

  listDishEvents(since: Date): Promise<DishEvent[]> {
    return this.api.get<DishEvent[]>(`/api/admin/events?since=${encodeURIComponent(since.toISOString())}`);
  }
}
