import type { DishEvent, DishEventKind } from "./types";

export interface AnalyticsRepository {
  trackDishEvent(dishId: string, kind: DishEventKind): Promise<void>;
  /** Admin only. */
  listDishEvents(since: Date): Promise<DishEvent[]>;
}
