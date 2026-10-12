import { describe, expect, it, vi } from "vitest";
import { OrderValidationError, placeOrder, type PlaceOrderInput } from "./placeOrder";
import type { OrderRepository } from "../domain/ports";
import type { DishRepository } from "@/modules/menu/domain/ports";
import type { Dish } from "@/modules/menu/domain/types";

function dish(id: string, overrides: Partial<Dish> = {}): Dish {
  return {
    id,
    slug: id,
    name: id.toUpperCase(),
    description: "",
    priceCents: 1000,
    categoryId: "c1",
    imageUrl: null,
    modelGlbUrl: null,
    modelUsdzUrl: null,
    diameterCm: null,
    heightCm: null,
    weightG: null,
    serves: null,
    modelScale: 1,
    allergens: [],
    isAvailable: true,
    isFeatured: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function setup(dishes: Dish[]) {
  const place = vi.fn(async () => ({ id: "o1", code: "A-001" }));
  const orders = { place } as unknown as OrderRepository;
  const dishRepo = { list: vi.fn(async () => dishes) } as unknown as DishRepository;
  return { deps: { orders, dishes: dishRepo }, place };
}

const base: PlaceOrderInput = {
  items: [{ dishId: "a", quantity: 2 }],
  fulfillment: { type: "dine_in", table: "12" },
  customerName: "",
  source: "customer",
};

async function issues(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    if (e instanceof OrderValidationError) return e.issues;
    throw e;
  }
  return [];
}

describe("placeOrder use case", () => {
  it("places a valid dine-in order and maps the table label", async () => {
    const { deps, place } = setup([dish("a")]);
    const result = await placeOrder(deps, base);
    expect(result).toEqual({ id: "o1", code: "A-001" });
    expect(place).toHaveBeenCalledWith({
      items: [{ dishId: "a", quantity: 2, notes: "" }],
      tableLabel: "Mesa 12",
      customerName: "",
      notes: "",
      source: "customer",
    });
  });

  it("maps pickup orders to the 'Para llevar' label", async () => {
    const { deps, place } = setup([dish("a")]);
    await placeOrder(deps, { ...base, fulfillment: { type: "pickup" }, customerName: "Sam" });
    expect(place).toHaveBeenCalledWith(expect.objectContaining({ tableLabel: "Para llevar", customerName: "Sam" }));
  });

  it("rejects an empty cart", async () => {
    const { deps, place } = setup([dish("a")]);
    const found = await issues(placeOrder(deps, { ...base, items: [] }));
    expect(found.map((i) => i.field)).toContain("items");
    expect(found[0].message).toBe("Tu pedido está vacío.");
    expect(place).not.toHaveBeenCalled();
  });

  it("rejects unavailable and unknown dishes", async () => {
    const { deps, place } = setup([dish("a", { isAvailable: false })]);
    const found = await issues(placeOrder(deps, base));
    expect(found[0].message).toMatch(/ya no está disponible/i);
    const unknown = await issues(placeOrder(deps, { ...base, items: [{ dishId: "zzz", quantity: 1 }] }));
    expect(unknown[0].message).toMatch(/ya no está disponible/i);
    expect(place).not.toHaveBeenCalled();
  });

  it("only needs the public catalog (customers cannot list unavailable dishes)", async () => {
    const { deps } = setup([dish("a")]);
    await placeOrder(deps, base);
    expect(deps.dishes.list).toHaveBeenCalledWith();
  });

  it("requires a table number for dine-in", async () => {
    const { deps } = setup([dish("a")]);
    const found = await issues(placeOrder(deps, { ...base, fulfillment: { type: "dine_in", table: "  " } }));
    expect(found.map((i) => i.field)).toContain("table");
  });

  it("requires a name for pickup", async () => {
    const { deps } = setup([dish("a")]);
    const found = await issues(placeOrder(deps, { ...base, fulfillment: { type: "pickup" }, customerName: " " }));
    expect(found.map((i) => i.field)).toContain("customerName");
  });

  it("rejects invalid quantities", async () => {
    const { deps } = setup([dish("a")]);
    expect((await issues(placeOrder(deps, { ...base, items: [{ dishId: "a", quantity: 0 }] }))).length).toBe(1);
    expect((await issues(placeOrder(deps, { ...base, items: [{ dishId: "a", quantity: 1.5 }] }))).length).toBe(1);
    expect((await issues(placeOrder(deps, { ...base, items: [{ dishId: "a", quantity: 100 }] }))).length).toBe(1);
  });

  it("collects multiple issues at once", async () => {
    const { deps } = setup([dish("a")]);
    const found = await issues(
      placeOrder(deps, { ...base, items: [], fulfillment: { type: "dine_in", table: "" } }),
    );
    expect(found.map((i) => i.field).sort()).toEqual(["items", "table"]);
  });

  it("trims notes and passes item notes through", async () => {
    const { deps, place } = setup([dish("a")]);
    await placeOrder(deps, {
      ...base,
      notes: "  allergy: nuts ",
      items: [{ dishId: "a", quantity: 1, notes: " no ice " }],
    });
    expect(place).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "allergy: nuts", items: [{ dishId: "a", quantity: 1, notes: "no ice" }] }),
    );
  });
});
