import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/shared/lib/http";
import { HttpOrderRepository, type EventSourceLike } from "./httpOrderRepository";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const order = {
  id: "o1",
  code: "A-001",
  status: "pending",
  source: "customer",
  tableLabel: "Table 1",
  customerName: "",
  notes: "",
  totalCents: 100,
  createdBy: null,
  createdAt: "2026-03-10T12:00:00.000Z",
  updatedAt: "2026-03-10T12:00:00.000Z",
  preparingAt: null,
  readyAt: null,
  servedAt: null,
  cancelledAt: null,
  items: [],
};

describe("HttpOrderRepository", () => {
  it("places orders sending only ids and quantities", async () => {
    const fetchMock = vi.fn(async () => json({ id: "o1", code: "A-001" }, 201));
    const repo = new HttpOrderRepository(createApiClient(fetchMock as unknown as typeof fetch));
    const placed = await repo.place({
      items: [{ dishId: "a", quantity: 2, notes: "x" }],
      tableLabel: "Table 12",
      customerName: "Ana",
      notes: "",
      source: "customer",
    });
    expect(placed).toEqual({ id: "o1", code: "A-001" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/orders");
    const body = JSON.parse(init.body as string);
    expect(body.items).toEqual([{ dishId: "a", quantity: 2, notes: "x" }]);
    expect(body.fulfillment).toEqual({ type: "dine_in", table: "12" });
    expect(body.tableLabel).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/price/i);
  });

  it("returns null for an unknown public order and builds list queries", async () => {
    const fetchMock = vi.fn(async (url: string) => (url.includes("/api/orders/missing") ? new Response("{}", { status: 404 }) : json([order])));
    const repo = new HttpOrderRepository(createApiClient(fetchMock as unknown as typeof fetch));
    expect(await repo.getPublic("missing")).toBeNull();
    await repo.list({ statuses: ["pending", "ready"], from: new Date("2026-03-01T00:00:00Z") });
    const url = fetchMock.mock.calls.at(-1)![0] as string;
    expect(url).toContain("status=pending%2Cready");
    expect(url).toContain("from=2026-03-01T00%3A00%3A00.000Z");
  });

  it("updates status with PATCH", async () => {
    const fetchMock = vi.fn(async () => json({ ...order, status: "preparing" }));
    const repo = new HttpOrderRepository(createApiClient(fetchMock as unknown as typeof fetch));
    const updated = await repo.updateStatus("o1", "preparing");
    expect(updated.status).toBe("preparing");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/orders/o1");
    expect(init.method).toBe("PATCH");
  });

  it("subscribes through EventSource and refetches on change and on reconnect", () => {
    class FakeES implements EventSourceLike {
      static instances: FakeES[] = [];
      listeners = new Map<string, Array<() => void>>();
      onerror: (() => void) | null = null;
      onopen: (() => void) | null = null;
      closed = false;
      constructor(public url: string) {
        FakeES.instances.push(this);
      }
      addEventListener(type: string, cb: () => void) {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), cb]);
      }
      close() {
        this.closed = true;
      }
      emit(type: string) {
        this.listeners.get(type)?.forEach((cb) => cb());
      }
    }
    const repo = new HttpOrderRepository(createApiClient(vi.fn() as unknown as typeof fetch), (url) => new FakeES(url));
    const onChange = vi.fn();
    const off = repo.subscribe(onChange);
    const es = FakeES.instances[0];
    expect(es.url).toBe("/api/orders/stream");
    es.emit("change");
    expect(onChange).toHaveBeenCalledTimes(1);
    es.onerror?.(); // connection dropped: EventSource retries by itself
    es.onopen?.(); // reconnected -> state may be stale, so refetch
    expect(onChange).toHaveBeenCalledTimes(2);
    off();
    expect(es.closed).toBe(true);
  });
});
