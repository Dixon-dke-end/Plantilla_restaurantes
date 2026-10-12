import type { OrderChangeEvent, OrderEventBus, Unsubscribe } from "../../domain/events";

/** Default bus: fan-out inside one Node process. Enough for a single instance (PGlite or one app container). */
export class InProcessOrderEventBus implements OrderEventBus {
  private readonly listeners = new Set<(event: OrderChangeEvent) => void>();

  async publish(event: OrderChangeEvent): Promise<void> {
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch {
        // One broken subscriber (e.g. a closed stream) must not affect the others.
      }
    }
  }

  subscribe(listener: (event: OrderChangeEvent) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
