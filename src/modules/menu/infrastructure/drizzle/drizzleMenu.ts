import { asc, eq } from "drizzle-orm";
import { ConflictError, NotFoundError } from "@/shared/lib/appErrors";
import { newId } from "@/shared/lib/id";
import type { Db } from "@/server/db/client";
import { categories, dishes } from "@/server/db/schema";
import type { CategoryRepository, DishRepository, ListDishesOptions } from "../../domain/ports";
import type { Category, Dish, DishInput, DishPatch } from "../../domain/types";

type DishRow = typeof dishes.$inferSelect;
type CategoryRow = typeof categories.$inferSelect;

export function mapDishRow(row: DishRow): Dish {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    categoryId: row.categoryId ?? "",
    imageUrl: row.imageUrl,
    modelGlbUrl: row.modelGlbUrl,
    modelUsdzUrl: row.modelUsdzUrl,
    diameterCm: row.diameterCm,
    heightCm: row.heightCm,
    weightG: row.weightG,
    serves: row.serves,
    modelScale: row.modelScale,
    allergens: row.allergens,
    isAvailable: row.isAvailable,
    isFeatured: row.isFeatured,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapCategoryRow(row: CategoryRow): Category {
  return { id: row.id, name: row.name, slug: row.slug, sort: row.sort };
}

const isUniqueViolation = (e: unknown): boolean => {
  const code = (e as { code?: string; cause?: { code?: string } } | null);
  return code?.code === "23505" || code?.cause?.code === "23505";
};

const columns = (patch: DishPatch) => ({
  ...patch,
  categoryId: patch.categoryId === "" ? null : patch.categoryId,
});

export class DrizzleDishRepository implements DishRepository {
  constructor(private readonly db: Db) {}

  async list(options: ListDishesOptions = {}): Promise<Dish[]> {
    const query = this.db.select().from(dishes);
    const rows = await (options.includeUnavailable ? query : query.where(eq(dishes.isAvailable, true))).orderBy(asc(dishes.name));
    return rows.map(mapDishRow);
  }

  async getBySlug(slug: string): Promise<Dish | null> {
    const [row] = await this.db.select().from(dishes).where(eq(dishes.slug, slug)).limit(1);
    return row ? mapDishRow(row) : null;
  }

  async getById(id: string): Promise<Dish | null> {
    const [row] = await this.db.select().from(dishes).where(eq(dishes.id, id)).limit(1);
    return row ? mapDishRow(row) : null;
  }

  async create(input: DishInput): Promise<Dish> {
    try {
      const [row] = await this.db
        .insert(dishes)
        .values({ ...columns(input), id: newId() } as typeof dishes.$inferInsert)
        .returning();
      return mapDishRow(row);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictError("El identificador (slug) ya está en uso.");
      throw e;
    }
  }

  async update(id: string, patch: DishPatch): Promise<Dish> {
    try {
      const [row] = await this.db
        .update(dishes)
        .set({ ...columns(patch), updatedAt: new Date() } as Partial<typeof dishes.$inferInsert>)
        .where(eq(dishes.id, id))
        .returning();
      if (!row) throw new NotFoundError("No se encontró el plato.");
      return mapDishRow(row);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictError("El identificador (slug) ya está en uso.");
      throw e;
    }
  }

  async remove(id: string): Promise<void> {
    const rows = await this.db.delete(dishes).where(eq(dishes.id, id)).returning({ id: dishes.id });
    if (rows.length === 0) throw new NotFoundError("No se encontró el plato.");
  }
}

export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<Category[]> {
    const rows = await this.db.select().from(categories).orderBy(asc(categories.sort), asc(categories.name));
    return rows.map(mapCategoryRow);
  }
}
