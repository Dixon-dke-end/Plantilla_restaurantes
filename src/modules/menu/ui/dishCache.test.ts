import { beforeEach, describe, expect, it } from "vitest";
import { clearDishCache, recallCatalog, recallDish, rememberCatalog } from "./dishCache";
import type { Category, Dish } from "../domain/types";

const dish = (slug: string): Dish => ({
  id: slug,
  slug,
  name: slug,
  description: "",
  priceCents: 100,
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
  createdAt: "",
  updatedAt: "",
});
const cats: Category[] = [{ id: "c1", name: "Postres", slug: "postres", sort: 1 }];

describe("dishCache", () => {
  beforeEach(clearDishCache);

  it("recalls nothing before the catalog has been loaded", () => {
    expect(recallCatalog()).toBeUndefined();
    expect(recallDish("carrot-cake")).toBeUndefined();
  });

  it("remembers the last catalog and finds dishes by slug", () => {
    rememberCatalog({ cats, items: [dish("carrot-cake"), dish("flan")] });
    expect(recallCatalog()?.items).toHaveLength(2);
    expect(recallDish("flan")?.slug).toBe("flan");
    expect(recallDish("missing")).toBeUndefined();
  });

  it("replaces the previous catalog", () => {
    rememberCatalog({ cats, items: [dish("a")] });
    rememberCatalog({ cats, items: [dish("b")] });
    expect(recallDish("a")).toBeUndefined();
    expect(recallDish("b")).toBeDefined();
  });
});
