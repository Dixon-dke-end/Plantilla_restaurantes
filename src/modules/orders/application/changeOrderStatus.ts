import { assertTransition } from "../domain/status";
import type { OrderRepository } from "../domain/ports";
import type { Order, OrderStatus } from "../domain/types";

/** Applies a status change after checking it against the state machine. */
export async function changeOrderStatus(
  deps: { orders: OrderRepository },
  order: Pick<Order, "id" | "status">,
  to: OrderStatus,
): Promise<Order> {
  assertTransition(order.status, to);
  return deps.orders.updateStatus(order.id, to);
}
