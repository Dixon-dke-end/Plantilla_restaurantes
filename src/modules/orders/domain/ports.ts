import type {
  Order,
  OrderFilter,
  OrderStatus,
  PlaceOrderCommand,
  PlacedOrder,
  PublicOrder,
} from "./types";

import type { Unsubscribe } from "./events";
export type { Unsubscribe };

export interface OrderRepository {
  /** Computes prices server-side (catalog), rejects unavailable dishes. */
  place(command: PlaceOrderCommand): Promise<PlacedOrder>;
  /** Public tracking lookup by id (the id acts as an unguessable token). */
  getPublic(id: string): Promise<PublicOrder | null>;
  /** Staff only. */
  list(filter?: OrderFilter): Promise<Order[]>;
  /** Staff only. */
  updateStatus(id: string, status: OrderStatus): Promise<Order>;
  /** Notifies on any order change (realtime). */
  subscribe(onChange: () => void): Unsubscribe;
}
