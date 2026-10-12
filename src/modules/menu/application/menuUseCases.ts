import { validateDishInput, type DishErrors } from "../domain/validation";
import type { DishRepository } from "../domain/ports";
import type { Category, Dish, DishInput } from "../domain/types";

export class DishValidationError extends Error {
  constructor(public readonly errors: DishErrors) {
    super("El plato no es válido: " + Object.values(errors).join(" "));
    this.name = "DishValidationError";
  }
}

/** Validates (including slug uniqueness) and creates or updates a dish. */
export async function saveDish(
  deps: { dishes: DishRepository },
  input: DishInput,
  id?: string,
): Promise<Dish> {
  const existing = await deps.dishes.list({ includeUnavailable: true });
  const takenSlugs = new Set(existing.filter((d) => d.id !== id).map((d) => d.slug));
  const result = validateDishInput(input, { takenSlugs });
  if (!result.ok) throw new DishValidationError(result.errors);
  return id ? deps.dishes.update(id, input) : deps.dishes.create(input);
}

export type CategoryGroup = { category: Category; dishes: Dish[] };

/** Groups dishes by category in sort order, omitting empty categories. */
export function groupByCategory(categories: Category[], dishes: Dish[]): CategoryGroup[] {
  return [...categories]
    .sort((a, b) => a.sort - b.sort)
    .map((category) => ({ category, dishes: dishes.filter((d) => d.categoryId === category.id) }))
    .filter((g) => g.dishes.length > 0);
}
