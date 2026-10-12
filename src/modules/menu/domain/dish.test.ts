import { describe, expect, it } from "vitest";
import { ALLERGEN_OPTIONS, allergenLabel, dishTransitionName } from "./dish";

describe("allergenLabel", () => {
  it("translates every stored allergen key to Spanish", () => {
    expect(ALLERGEN_OPTIONS.map(allergenLabel)).toEqual([
      "Gluten",
      "Lácteos",
      "Huevo",
      "Frutos secos",
      "Cacahuate",
      "Soya",
      "Pescado",
      "Mariscos",
      "Sésamo",
    ]);
  });
  it("falls back to the stored value for custom allergens", () => {
    expect(allergenLabel("mostaza")).toBe("mostaza");
  });
});

describe("dishTransitionName", () => {
  it("is unique per slug and a valid CSS identifier", () => {
    expect(dishTransitionName("carrot-cake")).toBe("dish-carrot-cake");
    expect(dishTransitionName("a")).not.toBe(dishTransitionName("b"));
    expect(dishTransitionName("1-egg")).toMatch(/^[a-z][a-z0-9-]*$/);
  });
});
