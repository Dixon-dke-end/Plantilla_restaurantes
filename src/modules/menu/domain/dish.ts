import type { Dish, DishInput } from "./types";

export const hasArModel = (dish: Pick<Dish, "modelGlbUrl" | "modelUsdzUrl">): boolean =>
  Boolean(dish.modelGlbUrl || dish.modelUsdzUrl);

export const ALLERGEN_OPTIONS = [
  "gluten",
  "dairy",
  "eggs",
  "nuts",
  "peanuts",
  "soy",
  "fish",
  "shellfish",
  "sesame",
] as const;

/** Allergen keys stay in English in the database; this is what guests and staff read. */
const ALLERGEN_LABELS: Record<(typeof ALLERGEN_OPTIONS)[number], string> = {
  gluten: "Gluten",
  dairy: "Lácteos",
  eggs: "Huevo",
  nuts: "Frutos secos",
  peanuts: "Cacahuate",
  soy: "Soya",
  fish: "Pescado",
  shellfish: "Mariscos",
  sesame: "Sésamo",
};

export const allergenLabel = (key: string): string =>
  (ALLERGEN_LABELS as Record<string, string>)[key] ?? key;

/** `view-transition-name` shared by a dish card image and the dish page viewer (unique per slug). */
export const dishTransitionName = (slug: string): string => `dish-${slug}`;

export const emptyDishInput = (categoryId = ""): DishInput => ({
  slug: "",
  name: "",
  description: "",
  priceCents: 0,
  categoryId,
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
});
