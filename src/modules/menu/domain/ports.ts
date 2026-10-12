import type { Category, Dish, DishInput, DishPatch } from "./types";

export type ListDishesOptions = {
  /** Admin screens need unavailable dishes too; public screens do not. */
  includeUnavailable?: boolean;
};

export interface DishRepository {
  list(options?: ListDishesOptions): Promise<Dish[]>;
  getBySlug(slug: string): Promise<Dish | null>;
  getById(id: string): Promise<Dish | null>;
  create(input: DishInput): Promise<Dish>;
  update(id: string, patch: DishPatch): Promise<Dish>;
  remove(id: string): Promise<void>;
}

export interface CategoryRepository {
  list(): Promise<Category[]>;
}

export type MediaKind = "image" | "model-glb" | "model-usdz";

export interface MediaStorage {
  /** Stores a file and returns a URL the browser can load directly. */
  upload(file: File | Blob, kind: MediaKind, fileName?: string): Promise<string>;
  /** Best-effort deletion of a previously uploaded file. */
  remove(url: string): Promise<void>;
}
