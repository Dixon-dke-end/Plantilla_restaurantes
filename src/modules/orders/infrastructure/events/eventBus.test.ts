import { describe, expect, it, vi } from "vitest";
import { InProcessOrderEventBus } from "./inProcessBus";
import { PgNotifyOrderEventBus, type PgNotifyTransport } from "./pgNotifyBus";
import type { OrderChangeEvent } from "../../domain/events";

const event: OrderChangeEvent = { type: "created", orderId: "o1", status: "pending", at: "2026-03-10T12:00:00.000Z" };

describe("InProcessOrderEventBus", () => {
  it("delivers events to all subscribers until they unsubscribe", async () => {
    const bus = new InProcessOrderEventBus();
    const a = vi.fn();
    const b = vi.fn();
    const offA = bus.subscribe(a);
    bus.subscribe(b);
    await bus.publish(event);
    offA();
    await bus.publish(event);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
    expect(a).toHaveBeenCalledWith(event);
  });

  it("isolates a throwing listener from the others", async () => {
    const bus = new InProcessOrderEventBus();
    const ok = vi.fn();
    bus.subscribe(() => {
      throw new Error("boom");
    });
    bus.subscribe(ok);
    await expect(bus.publish(event)).resolves.toBeUndefined();
    expect(ok).toHaveBeenCalled();
  });
});

function fakeTransport() {
  const handlers = new Set<(payload: string) => void>();
  const transport: PgNotifyTransport = {
    notify: vi.fn(async (_channel: string, payload: string) => {
      handlers.forEach((h) => h(payload));
    }),
    listen: vi.fn(async (_channel: string, handler: (payload: string) => void) => {
      handlers.add(handler);
      return async () => {
        handlers.delete(handler);
      };
    }),
  };
  return { transport, handlers };
}

describe("PgNotifyOrderEventBus", () => {
  it("publishes through NOTIFY and fans incoming notifications out locally", async () => {
    const { transport } = fakeTransport();
    const bus = new PgNotifyOrderEventBus(transport);
    const listener = vi.fn();
    bus.subscribe(listener);
    await bus.publish(event);
    expect(transport.notify).toHaveBeenCalledWith("order_events", JSON.stringify(event));
    expect(listener).toHaveBeenCalledWith(event);
  });

  it("starts listening once and stops when the last subscriber leaves", async () => {
    const { transport, handlers } = fakeTransport();
    const bus = new PgNotifyOrderEventBus(transport);
    const off1 = bus.subscribe(() => {});
    const off2 = bus.subscribe(() => {});
    await bus.ready();
    expect(transport.listen).toHaveBeenCalledTimes(1);
    off1();
    expect(handlers.size).toBe(1);
    off2();
    await bus.ready();
    expect(handlers.size).toBe(0);
  });

  it("receives events published by other instances and ignores malformed payloads", async () => {
    const { transport, handlers } = fakeTransport();
    const bus = new PgNotifyOrderEventBus(transport);
    const listener = vi.fn();
    bus.subscribe(listener);
    await bus.ready();
    handlers.forEach((h) => h("not json"));
    handlers.forEach((h) => h(JSON.stringify({ nope: true })));
    expect(listener).not.toHaveBeenCalled();
    handlers.forEach((h) => h(JSON.stringify(event)));
    expect(listener).toHaveBeenCalledWith(event);
  });
});
