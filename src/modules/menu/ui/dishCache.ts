import type { Category, Dish } from "../domain/types";

export type Catalog = { cats: Category[]; items: Dish[] };

/**
 * In-memory copy of the last public catalog the browser loaded. Menu, landing and dish pages seed
 * their first render from it (then revalidate), so a shared-element view transition finds its
 * destination in the same commit as the navigation. Never used on the server.
 */
let catalog: Catalog | undefined;

export const rememberCatalog = (next: Catalog): void => {
  catalog = next;
};

export const recallCatalog = (): Catalog | undefined => catalog;

export const recallDish = (slug: string): Dish | undefined => catalog?.items.find((d) => d.slug === slug);

export const clearDishCache = (): void => {
  catalog = undefined;
};
