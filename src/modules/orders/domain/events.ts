import type { OrderStatus } from "./types";

export type OrderChangeEvent = {
  type: "created" | "updated";
  orderId: string;
  status: OrderStatus;
  /** ISO timestamp. */
  at: string;
};

export type Unsubscribe = () => void;

/** Fan-out of order changes to live subscribers (SSE streams). */
export interface OrderEventBus {
  publish(event: OrderChangeEvent): Promise<void>;
  subscribe(listener: (event: OrderChangeEvent) => void): Unsubscribe;
}
