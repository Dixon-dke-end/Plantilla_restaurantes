import { SLUG_PATTERN } from "./slug";
import type { DishInput } from "./types";

export type DishErrors = Partial<Record<keyof DishInput, string>>;

export type DishValidation = { ok: boolean; errors: DishErrors };

const positive = (n: number) => Number.isFinite(n) && n > 0;
const positiveInt = (n: number) => Number.isInteger(n) && n > 0;

export function validateDishInput(input: DishInput, ctx: { takenSlugs: ReadonlySet<string> }): DishValidation {
  const errors: DishErrors = {};

  if (!input.name.trim()) errors.name = "El nombre es obligatorio.";

  if (!input.slug) errors.slug = "El identificador (slug) es obligatorio.";
  else if (!SLUG_PATTERN.test(input.slug)) errors.slug = "Usa minúsculas, números y guiones simples.";
  else if (ctx.takenSlugs.has(input.slug)) errors.slug = "Este identificador ya está en uso por otro plato.";

  if (!input.categoryId) errors.categoryId = "Elige una categoría.";
  if (!positiveInt(input.priceCents)) errors.priceCents = "Ingresa un precio mayor que cero.";

  const hasModel = Boolean(input.modelGlbUrl || input.modelUsdzUrl);
  if (input.diameterCm === null) {
    if (hasModel) errors.diameterCm = "Ingresa el diámetro real para poder calibrar el modelo 3D.";
  } else if (!positive(input.diameterCm)) {
    errors.diameterCm = "El diámetro debe ser mayor que cero.";
  }
  if (input.heightCm !== null && !positive(input.heightCm)) errors.heightCm = "La altura debe ser mayor que cero.";
  if (input.weightG !== null && !positiveInt(input.weightG)) errors.weightG = "El peso debe ser un número entero de gramos.";
  if (input.serves !== null && !positiveInt(input.serves)) errors.serves = "Las porciones deben ser un número entero, 1 o más.";
  if (!positive(input.modelScale)) errors.modelScale = "La escala debe ser mayor que cero.";

  return { ok: Object.keys(errors).length === 0, errors };
}
