import { describe, expect, it } from "vitest";
import { DEMO_CATEGORIES, DEMO_DISHES } from "./catalog";

describe("demo catalog", () => {
  it("names the categories in Spanish while keeping ids and slugs stable", () => {
    expect(DEMO_CATEGORIES.map((c) => c.name)).toEqual(["Entradas", "Principales", "Postres", "Panadería", "Bebidas"]);
    expect(DEMO_CATEGORIES.map((c) => c.id)).toEqual(["cat-starters", "cat-mains", "cat-desserts", "cat-bakery", "cat-drinks"]);
    expect(DEMO_CATEGORIES.map((c) => c.slug)).toEqual(["starters", "mains", "desserts", "bakery", "drinks"]);
  });

  it("keeps dish ids and URL slugs stable so existing links and QR codes keep working", () => {
    expect(DEMO_DISHES.map((d) => d.slug)).toEqual([
      "harvest-salad",
      "smoked-lamb-meatballs",
      "avocado-smash",
      "grilled-ribeye",
      "seared-salmon",
      "ember-burger",
      "carrot-cake",
      "strawberry-chocolate-cake",
      "butter-croissant",
      "brioche-bread-basket",
      "house-lemonade",
      "espresso",
    ]);
    expect(DEMO_DISHES.find((d) => d.slug === "carrot-cake")?.id).toBe("dish-carrot-cake");
  });

  it("writes dish names and descriptions in Spanish", () => {
    const carrot = DEMO_DISHES.find((d) => d.slug === "carrot-cake")!;
    expect(carrot.name).toBe("Pastel de zanahoria");
    for (const dish of DEMO_DISHES) {
      expect(dish.description, dish.slug).not.toMatch(/\b(the|with|and|over|fresh)\b/i);
    }
  });
});
