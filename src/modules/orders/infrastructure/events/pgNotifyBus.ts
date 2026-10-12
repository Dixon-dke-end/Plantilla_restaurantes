import type { OrderChangeEvent, OrderEventBus, Unsubscribe } from "../../domain/events";

export const ORDER_EVENTS_CHANNEL = "order_events";

/** Thin seam over Postgres LISTEN/NOTIFY so the bus logic is testable without a database. */
export interface PgNotifyTransport {
  notify(channel: string, payload: string): Promise<void>;
  /** Starts listening; resolves with a function that stops listening. */
  listen(channel: string, handler: (payload: string) => void): Promise<() => Promise<void>>;
}

const isEvent = (value: unknown): value is OrderChangeEvent => {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.type === "string" && typeof v.orderId === "string" && typeof v.status === "string" && typeof v.at === "string";
};

/**
 * Multi-instance bus: every instance publishes with NOTIFY and fans incoming notifications out to its
 * own subscribers, so SSE clients see changes made through any instance. The LISTEN connection is only
 * held while at least one subscriber exists.
 */
export class PgNotifyOrderEventBus implements OrderEventBus {
  private readonly listeners = new Set<(event: OrderChangeEvent) => void>();
  private chain: Promise<void> = Promise.resolve();
  private unlisten: (() => Promise<void>) | null = null;

  constructor(private readonly transport: PgNotifyTransport) {}

  async publish(event: OrderChangeEvent): Promise<void> {
    await this.transport.notify(ORDER_EVENTS_CHANNEL, JSON.stringify(event));
  }

  subscribe(listener: (event: OrderChangeEvent) => void): Unsubscribe {
    this.listeners.add(listener);
    if (this.listeners.size === 1) this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  }

  /** Resolves when pending listen/unlisten work has settled. */
  ready(): Promise<void> {
    return this.chain;
  }

  private start() {
    const listening = this.transport.listen(ORDER_EVENTS_CHANNEL, (payload) => this.dispatch(payload));
    this.chain = this.chain
      .then(() => listening)
      .then((stop) => {
        this.unlisten = stop;
      })
      .catch(() => undefined);
  }

  private stop() {
    this.chain = this.chain.then(async () => {
      const stop = this.unlisten;
      this.unlisten = null;
      if (stop) await stop().catch(() => undefined);
    });
  }

  private dispatch(payload: string) {
    let event: unknown;
    try {
      event = JSON.parse(payload);
    } catch {
      return;
    }
    if (!isEvent(event)) return;
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch {
        /* isolate subscribers */
      }
    }
  }
}
