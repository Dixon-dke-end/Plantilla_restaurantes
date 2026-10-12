import type { ApiClient } from "@/shared/lib/http";
import { labelToFulfillment } from "../../domain/fulfillment";
import type { OrderRepository, Unsubscribe } from "../../domain/ports";
import type { Order, OrderFilter, OrderStatus, PlaceOrderCommand, PlacedOrder, PublicOrder } from "../../domain/types";

/** The subset of EventSource we use (lets tests inject a fake). */
export interface EventSourceLike {
  addEventListener(type: string, listener: () => void): void;
  close(): void;
  onerror: (() => void) | null;
  onopen: (() => void) | null;
}

const defaultEventSource = (url: string): EventSourceLike =>
  new EventSource(url, { withCredentials: true }) as unknown as EventSourceLike;

/** Browser-side OrderRepository: REST for commands/queries, Server-Sent Events for realtime. */
export class HttpOrderRepository implements OrderRepository {
  constructor(
    private readonly api: ApiClient,
    private readonly eventSource: (url: string) => EventSourceLike = defaultEventSource,
  ) {}

  place(command: PlaceOrderCommand): Promise<PlacedOrder> {
    // Only ids and quantities are sent; the server prices the order from its database.
    return this.api.post<PlacedOrder>("/api/orders", {
      items: command.items.map((i) => ({ dishId: i.dishId, quantity: i.quantity, notes: i.notes ?? "" })),
      fulfillment: labelToFulfillment(command.tableLabel),
      customerName: command.customerName,
      notes: command.notes,
      source: command.source,
    });
  }

  getPublic(id: string): Promise<PublicOrder | null> {
    return this.api.getOrNull<PublicOrder>(`/api/orders/${encodeURIComponent(id)}`);
  }

  list(filter: OrderFilter = {}): Promise<Order[]> {
    const params = new URLSearchParams();
    if (filter.statuses?.length) params.set("status", filter.statuses.join(","));
    if (filter.from) params.set("from", filter.from.toISOString());
    if (filter.to) params.set("to", filter.to.toISOString());
    const query = params.toString();
    return this.api.get<Order[]>(`/api/orders${query ? `?${query}` : ""}`);
  }

  updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return this.api.patch<Order>(`/api/orders/${encodeURIComponent(id)}`, { status });
  }

  subscribe(onChange: () => void): Unsubscribe {
    const source = this.eventSource("/api/orders/stream");
    let dropped = false;
    source.addEventListener("change", () => onChange());
    // EventSource reconnects on its own; after a drop we may have missed events, so refetch once.
    source.onerror = () => {
      dropped = true;
    };
    source.onopen = () => {
      if (dropped) {
        dropped = false;
        onChange();
      }
    };
    return () => source.close();
  }
}
