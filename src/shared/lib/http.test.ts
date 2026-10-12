import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "./http";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("createApiClient", () => {
  it("sends JSON and parses JSON responses", async () => {
    const fetchMock = vi.fn(async () => json({ id: "o1" }));
    const api = createApiClient(fetchMock as unknown as typeof fetch);
    const res = await api.post<{ id: string }>("/api/orders", { a: 1 });
    expect(res.id).toBe("o1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/orders");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
    expect(init.credentials).toBe("same-origin");
  });

  it("throws ApiError with the server message and details", async () => {
    const api = createApiClient((async () => json({ error: "Tu pedido está vacío.", issues: [{ field: "items" }] }, 422)) as typeof fetch);
    await expect(api.post("/x", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "Tu pedido está vacío.",
      details: { issues: [{ field: "items" }] },
    });
    await expect(api.post("/x", {})).rejects.toBeInstanceOf(ApiError);
  });

  it("returns null for 404 on getOrNull and falls back to a generic message", async () => {
    const api = createApiClient((async () => new Response("nope", { status: 404 })) as typeof fetch);
    expect(await api.getOrNull("/x")).toBeNull();
    const broken = createApiClient((async () => new Response("oops", { status: 500 })) as typeof fetch);
    await expect(broken.get("/x")).rejects.toThrow(/la solicitud falló/i);
  });

  it("handles 204 responses", async () => {
    const api = createApiClient((async () => new Response(null, { status: 204 })) as typeof fetch);
    expect(await api.del("/x")).toBeUndefined();
  });
});
