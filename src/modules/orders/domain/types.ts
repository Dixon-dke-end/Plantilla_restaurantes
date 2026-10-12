export const ORDER_STATUSES = [
  "pending",
  "preparing",
  "ready",
  "served",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderSource = "customer" | "staff";

export type OrderItem = {
  dishId: string;
  dishName: string;
  unitPriceCents: number;
  quantity: number;
  notes: string;
};

export type Order = {
  id: string;
  code: string;
  status: OrderStatus;
  source: OrderSource;
  /** "Table 12" or "Pickup". */
  tableLabel: string;
  customerName: string;
  notes: string;
  totalCents: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  preparingAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
  cancelledAt: string | null;
  items: OrderItem[];
};

/** What the public tracking page may see. */
export type PublicOrder = Pick<
  Order,
  | "id"
  | "code"
  | "status"
  | "tableLabel"
  | "totalCents"
  | "createdAt"
  | "updatedAt"
  | "preparingAt"
  | "readyAt"
  | "servedAt"
  | "cancelledAt"
  | "items"
>;

export type PlaceOrderLine = {
  dishId: string;
  quantity: number;
  notes?: string;
};

/** Repository-level command. Prices are never accepted from the client. */
export type PlaceOrderCommand = {
  items: PlaceOrderLine[];
  tableLabel: string;
  customerName: string;
  notes: string;
  source: OrderSource;
  /** Staff user who created the order (staff source only). */
  createdBy?: string | null;
};

export type PlacedOrder = { id: string; code: string };

export type OrderFilter = {
  statuses?: OrderStatus[];
  from?: Date;
  to?: Date;
};
