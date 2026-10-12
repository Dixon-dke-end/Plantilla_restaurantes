import { describe, expect, it } from "vitest";
import { validateDishInput } from "./validation";
import type { DishInput } from "./types";

const valid: DishInput = {
  slug: "carrot-cake",
  name: "Carrot Cake",
  description: "Spiced layers.",
  priceCents: 900,
  categoryId: "cat-desserts",
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
};

describe("validateDishInput", () => {
  it("accepts a valid dish", () => {
    expect(validateDishInput(valid, { takenSlugs: new Set() })).toEqual({ ok: true, errors: {} });
  });
  it("requires a name, slug, category and positive price", () => {
    const r = validateDishInput(
      { ...valid, name: " ", slug: "", categoryId: "", priceCents: 0 },
      { takenSlugs: new Set() },
    );
    expect(r.ok).toBe(false);
    expect(Object.keys(r.errors).sort()).toEqual(["categoryId", "name", "priceCents", "slug"]);
  });
  it("rejects malformed and duplicate slugs", () => {
    expect(validateDishInput({ ...valid, slug: "Bad Slug" }, { takenSlugs: new Set() }).errors.slug).toBeDefined();
    expect(validateDishInput(valid, { takenSlugs: new Set(["carrot-cake"]) }).errors.slug).toMatch(/ya está en uso/i);
  });
  it("requires a real diameter when a 3D model is attached", () => {
    const r = validateDishInput({ ...valid, modelGlbUrl: "blob:x" }, { takenSlugs: new Set() });
    expect(r.errors.diameterCm).toBeDefined();
    const ok = validateDishInput({ ...valid, modelGlbUrl: "blob:x", diameterCm: 22 }, { takenSlugs: new Set() });
    expect(ok.ok).toBe(true);
  });
  it("validates optional numeric fields when present", () => {
    const r = validateDishInput(
      { ...valid, diameterCm: -1, heightCm: 0, weightG: 1.5, serves: 0, modelScale: 0 },
      { takenSlugs: new Set() },
    );
    expect(Object.keys(r.errors).sort()).toEqual(["diameterCm", "heightCm", "modelScale", "serves", "weightG"]);
  });
});
