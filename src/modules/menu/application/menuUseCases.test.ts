import { describe, expect, it } from "vitest";
import { DishValidationError, groupByCategory, saveDish } from "./menuUseCases";
import type { Category, Dish, DishInput } from "../domain/types";
import type { DishRepository } from "../domain/ports";

const input = (overrides: Partial<DishInput> = {}): DishInput => ({
  slug: "carrot-cake",
  name: "Carrot Cake",
  description: "",
  priceCents: 900,
  categoryId: "cat-1",
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
  ...overrides,
});

/** Minimal in-memory DishRepository: the use case only depends on the port. */
function memoryDishes(): DishRepository {
  const rows: Dish[] = [];
  let n = 0;
  return {
    async list(options) {
      return options?.includeUnavailable ? [...rows] : rows.filter((d) => d.isAvailable);
    },
    async getBySlug(slug) {
      return rows.find((d) => d.slug === slug) ?? null;
    },
    async getById(id) {
      return rows.find((d) => d.id === id) ?? null;
    },
    async create(input) {
      const dish = { ...input, id: `d${++n}`, createdAt: "t", updatedAt: "t" } as Dish;
      rows.push(dish);
      return dish;
    },
    async update(id, patch) {
      const i = rows.findIndex((d) => d.id === id);
      rows[i] = { ...rows[i], ...patch };
      return rows[i];
    },
    async remove(id) {
      rows.splice(rows.findIndex((d) => d.id === id), 1);
    },
  };
}

function deps() {
  return { dishes: memoryDishes() };
}

describe("saveDish", () => {
  it("creates a valid dish", async () => {
    const d = deps();
    const dish = await saveDish(d, input());
    expect(dish.id).toBeTruthy();
    expect((await d.dishes.list()).length).toBe(1);
  });

  it("throws field errors for invalid input and stores nothing", async () => {
    const d = deps();
    await expect(saveDish(d, input({ name: "", priceCents: 0 }))).rejects.toBeInstanceOf(DishValidationError);
    expect(await d.dishes.list({ includeUnavailable: true })).toEqual([]);
  });

  it("rejects a slug that belongs to another dish but allows keeping its own slug", async () => {
    const d = deps();
    const first = await saveDish(d, input());
    await saveDish(d, input({ slug: "other", name: "Other" }));
    await expect(saveDish(d, input({ slug: "other" }), first.id)).rejects.toBeInstanceOf(DishValidationError);
    const updated = await saveDish(d, input({ priceCents: 1000 }), first.id);
    expect(updated.priceCents).toBe(1000);
  });
});

describe("groupByCategory", () => {
  it("groups dishes in category sort order and drops empty categories", () => {
    const cats: Category[] = [
      { id: "m", name: "Mains", slug: "mains", sort: 2 },
      { id: "s", name: "Starters", slug: "starters", sort: 1 },
      { id: "e", name: "Empty", slug: "empty", sort: 3 },
    ];
    const dishes = [
      { id: "1", categoryId: "m", name: "Steak" },
      { id: "2", categoryId: "s", name: "Soup" },
    ] as Dish[];
    const groups = groupByCategory(cats, dishes);
    expect(groups.map((g) => g.category.name)).toEqual(["Starters", "Mains"]);
    expect(groups[1].dishes[0].name).toBe("Steak");
  });
});
