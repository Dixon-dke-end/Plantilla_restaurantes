import { describe, expect, it } from "vitest";
import {
  dishBodySchema,
  dishEventBodySchema,
  orderStatusBodySchema,
  ordersQuerySchema,
  placeOrderBodySchema,
  roleBodySchema,
  teamCreateBodySchema,
} from "./schemas";

describe("placeOrderBodySchema", () => {
  const valid = {
    items: [{ dishId: "a", quantity: 2, notes: " no ice " }],
    fulfillment: { type: "dine_in", table: " 12 " },
    customerName: "Ana",
  };

  it("parses a dine-in order, trimming strings and defaulting source", () => {
    const r = placeOrderBodySchema.parse(valid);
    expect(r.items[0].notes).toBe("no ice");
    expect(r.fulfillment).toEqual({ type: "dine_in", table: "12" });
    expect(r.source).toBe("customer");
    expect(r.notes).toBe("");
  });

  it("parses pickup orders", () => {
    expect(placeOrderBodySchema.parse({ ...valid, fulfillment: { type: "pickup" } }).fulfillment.type).toBe("pickup");
  });

  it("strips client-supplied prices", () => {
    const r = placeOrderBodySchema.parse({ ...valid, items: [{ dishId: "a", quantity: 1, unitPriceCents: 1 }] });
    expect(r.items[0]).not.toHaveProperty("unitPriceCents");
  });

  it.each([
    ["empty items", { ...valid, items: [] }],
    ["zero quantity", { ...valid, items: [{ dishId: "a", quantity: 0 }] }],
    ["fractional quantity", { ...valid, items: [{ dishId: "a", quantity: 1.5 }] }],
    ["huge quantity", { ...valid, items: [{ dishId: "a", quantity: 100 }] }],
    ["unknown fulfillment", { ...valid, fulfillment: { type: "delivery" } }],
    ["too many items", { ...valid, items: Array.from({ length: 51 }, () => ({ dishId: "a", quantity: 1 })) }],
    ["bad source", { ...valid, source: "admin" }],
    ["long note", { ...valid, notes: "x".repeat(501) }],
  ])("rejects %s", (_name, body) => {
    expect(placeOrderBodySchema.safeParse(body).success).toBe(false);
  });
});

describe("orderStatusBodySchema", () => {
  it("accepts only known statuses", () => {
    expect(orderStatusBodySchema.parse({ status: "ready" }).status).toBe("ready");
    expect(orderStatusBodySchema.safeParse({ status: "teleported" }).success).toBe(false);
  });
});

describe("ordersQuerySchema", () => {
  it("parses comma separated statuses and ISO dates", () => {
    const q = ordersQuerySchema.parse({ status: "pending,ready", from: "2026-03-01T00:00:00Z", to: "2026-03-02T00:00:00Z" });
    expect(q.statuses).toEqual(["pending", "ready"]);
    expect(q.from).toBeInstanceOf(Date);
  });
  it("accepts an empty query and rejects bad values", () => {
    expect(ordersQuerySchema.parse({})).toEqual({});
    expect(ordersQuerySchema.safeParse({ status: "nope" }).success).toBe(false);
    expect(ordersQuerySchema.safeParse({ from: "yesterday" }).success).toBe(false);
  });
});

describe("dishBodySchema", () => {
  const dish = {
    slug: "carrot-cake",
    name: "Carrot Cake",
    description: "",
    priceCents: 900,
    categoryId: "c1",
    imageUrl: "/media/image/a.png",
    modelGlbUrl: "https://dl.polyhaven.org/x.gltf",
    modelUsdzUrl: null,
    diameterCm: 22.5,
    heightCm: null,
    weightG: null,
    serves: null,
    modelScale: 1,
    allergens: ["gluten"],
    isAvailable: true,
    isFeatured: false,
  };
  it("accepts a valid dish with local and remote media URLs", () => {
    expect(dishBodySchema.safeParse(dish).success).toBe(true);
  });
  it("rejects javascript: and other unsafe URLs", () => {
    expect(dishBodySchema.safeParse({ ...dish, imageUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(dishBodySchema.safeParse({ ...dish, modelGlbUrl: "data:text/html,x" }).success).toBe(false);
  });
  it("rejects invalid numbers and slugs", () => {
    expect(dishBodySchema.safeParse({ ...dish, priceCents: -1 }).success).toBe(false);
    expect(dishBodySchema.safeParse({ ...dish, priceCents: 9.5 }).success).toBe(false);
    expect(dishBodySchema.safeParse({ ...dish, slug: "Bad Slug" }).success).toBe(false);
    expect(dishBodySchema.safeParse({ ...dish, modelScale: 0 }).success).toBe(false);
  });
});

describe("dishEventBodySchema", () => {
  it("accepts view and ar_launch only", () => {
    expect(dishEventBodySchema.safeParse({ dishId: "a", kind: "view" }).success).toBe(true);
    expect(dishEventBodySchema.safeParse({ dishId: "a", kind: "ar_launch" }).success).toBe(true);
    expect(dishEventBodySchema.safeParse({ dishId: "a", kind: "click" }).success).toBe(false);
  });
});

describe("validation messages", () => {
  it("are written in Spanish", () => {
    const r = teamCreateBodySchema.safeParse({ email: "nope", password: "short", fullName: "A", role: "employee" });
    expect(r.success).toBe(false);
    const messages = r.error!.issues.map((i) => i.message).join(" | ");
    expect(messages).toMatch(/inválid|esperaba|caracteres/i);
    expect(messages).not.toMatch(/(Invalid|Too small|expected)/);
  });
  it("uses Spanish custom messages for media URLs and slugs", () => {
    const r = dishBodySchema.safeParse({
      slug: "Bad Slug", name: "x", description: "", priceCents: 1, categoryId: "c", imageUrl: "javascript:1",
      modelGlbUrl: null, modelUsdzUrl: null, diameterCm: null, heightCm: null, weightG: null, serves: null,
      modelScale: 1, allergens: [], isAvailable: true, isFeatured: false,
    });
    const messages = r.error!.issues.map((i) => i.message).join(" | ");
    expect(messages).toMatch(/minúsculas/);
    expect(messages).toMatch(/archivo subido o una URL/);
  });
});

describe("team schemas", () => {
  it("requires a valid email and a strong enough password", () => {
    const ok = { email: "A@X.test", password: "long enough pw", fullName: "A", role: "employee" };
    expect(teamCreateBodySchema.parse(ok).email).toBe("a@x.test");
    expect(teamCreateBodySchema.safeParse({ ...ok, password: "short" }).success).toBe(false);
    expect(teamCreateBodySchema.safeParse({ ...ok, email: "nope" }).success).toBe(false);
    expect(teamCreateBodySchema.safeParse({ ...ok, role: "customer" }).success).toBe(false);
  });
  it("validates role updates", () => {
    expect(roleBodySchema.safeParse({ role: "admin" }).success).toBe(true);
    expect(roleBodySchema.safeParse({ role: "root" }).success).toBe(false);
  });
});
