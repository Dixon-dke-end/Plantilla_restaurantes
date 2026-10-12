import { fulfillmentToLabel, type Fulfillment } from "../domain/fulfillment";
import type { OrderRepository } from "../domain/ports";
import type { OrderSource, PlacedOrder } from "../domain/types";
import type { DishRepository } from "@/modules/menu/domain/ports";

export type OrderIssue = { field: string; message: string };

export class OrderValidationError extends Error {
  constructor(public readonly issues: OrderIssue[]) {
    super(issues.map((i) => i.message).join(" "));
    this.name = "OrderValidationError";
  }
}

export type PlaceOrderInput = {
  items: Array<{ dishId: string; quantity: number; notes?: string }>;
  fulfillment: Fulfillment;
  customerName: string;
  notes?: string;
  source: OrderSource;
  createdBy?: string | null;
};

const MAX_QTY = 99;

/**
 * Validates an order and hands it to the repository.
 * Only dish ids and quantities cross this boundary: prices are always resolved from the catalog
 * on the server, never from client input.
 */
export async function placeOrder(
  deps: { orders: OrderRepository; dishes: DishRepository },
  input: PlaceOrderInput,
): Promise<PlacedOrder> {
  const issues: OrderIssue[] = [];

  if (input.items.length === 0) issues.push({ field: "items", message: "Tu pedido está vacío." });

  if (input.fulfillment.type === "dine_in") {
    if (!input.fulfillment.table.trim()) issues.push({ field: "table", message: "Ingresa el número de mesa." });
  } else if (!input.customerName.trim()) {
    issues.push({ field: "customerName", message: "Ingresa un nombre para el pedido para llevar." });
  }

  if (input.items.length > 0) {
    const catalog = new Map((await deps.dishes.list()).map((d) => [d.id, d]));
    for (const line of input.items) {
      if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QTY) {
        issues.push({ field: "items", message: `La cantidad debe ser un número entero entre 1 y ${MAX_QTY}.` });
        continue;
      }
      const dish = catalog.get(line.dishId);
      if (!dish || !dish.isAvailable) {
        issues.push({
          field: "items",
          message: `${dish?.name ?? "Un plato de tu pedido"} ya no está disponible.`,
        });
      }
    }
  }

  if (issues.length > 0) throw new OrderValidationError(issues);

  return deps.orders.place({
    items: input.items.map((i) => ({ dishId: i.dishId, quantity: i.quantity, notes: (i.notes ?? "").trim() })),
    tableLabel: fulfillmentToLabel(input.fulfillment),
    customerName: input.customerName.trim(),
    notes: (input.notes ?? "").trim(),
    source: input.source,
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
  });
}
