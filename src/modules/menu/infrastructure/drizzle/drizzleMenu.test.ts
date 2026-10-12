import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, resetTestDb } from "@/server/db/testing";
import type { DbHandle } from "@/server/db/client";
import { categories } from "@/server/db/schema";
import { ConflictError, NotFoundError } from "@/shared/lib/appErrors";
import { DrizzleCategoryRepository, DrizzleDishRepository } from "./drizzleMenu";
import type { DishInput } from "../../domain/types";

let handle: DbHandle;
beforeAll(async () => {
  handle = await createTestDb();
}, 60_000);
afterAll(async () => {
  await handle.close();
});

const input = (overrides: Partial<DishInput> = {}): DishInput => ({
  slug: "carrot-cake",
  name: "Carrot Cake",
  description: "Spiced",
  priceCents: 900,
  categoryId: "cat-1",
  imageUrl: null,
  modelGlbUrl: null,
  modelUsdzUrl: null,
  diameterCm: 22.5,
  heightCm: null,
  weightG: null,
  serves: null,
  modelScale: 1,
  allergens: ["gluten"],
  isAvailable: true,
  isFeatured: false,
  ...overrides,
});

let repo: DrizzleDishRepository;
beforeEach(async () => {
  await resetTestDb(handle);
  await handle.db.insert(categories).values([
    { id: "cat-2", name: "Mains", slug: "mains", sort: 2 },
    { id: "cat-1", name: "Desserts", slug: "desserts", sort: 1 },
  ]);
  repo = new DrizzleDishRepository(handle.db);
});

describe("DrizzleDishRepository", () => {
  it("creates and reads dishes with ISO timestamps and typed fields", async () => {
    const dish = await repo.create(input({ modelScale: 1.6, allergens: ["gluten", "nuts"] }));
    expect(dish.id).toBeTruthy();
    expect(dish.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(dish.modelScale).toBe(1.6);
    expect(dish.allergens).toEqual(["gluten", "nuts"]);
    expect(dish.diameterCm).toBe(22.5);
    expect((await repo.getBySlug("carrot-cake"))?.id).toBe(dish.id);
    expect((await repo.getById(dish.id))?.name).toBe("Carrot Cake");
    expect(await repo.getBySlug("missing")).toBeNull();
    expect(await repo.getById("missing")).toBeNull();
  });

  it("hides unavailable dishes unless asked", async () => {
    await repo.create(input());
    await repo.create(input({ slug: "ghost", name: "Ghost", isAvailable: false }));
    expect((await repo.list()).map((d) => d.slug)).toEqual(["carrot-cake"]);
    expect(await repo.list({ includeUnavailable: true })).toHaveLength(2);
  });

  it("rejects duplicate slugs with a friendly error", async () => {
    await repo.create(input());
    await expect(repo.create(input())).rejects.toThrow(ConflictError);
    const other = await repo.create(input({ slug: "other", name: "Other" }));
    await expect(repo.update(other.id, { slug: "carrot-cake" })).rejects.toThrow(ConflictError);
  });

  it("merges partial updates and bumps updatedAt", async () => {
    const dish = await repo.create(input());
    await new Promise((r) => setTimeout(r, 5));
    const updated = await repo.update(dish.id, { priceCents: 1100, isFeatured: true });
    expect(updated.priceCents).toBe(1100);
    expect(updated.isFeatured).toBe(true);
    expect(updated.name).toBe("Carrot Cake");
    expect(updated.updatedAt >= dish.updatedAt).toBe(true);
  });

  it("throws for missing dishes on update/remove and removes existing ones", async () => {
    await expect(repo.update("nope", { name: "x" })).rejects.toThrow(NotFoundError);
    await expect(repo.remove("nope")).rejects.toThrow(NotFoundError);
    const dish = await repo.create(input());
    await repo.remove(dish.id);
    expect(await repo.list({ includeUnavailable: true })).toEqual([]);
  });
});

describe("DrizzleCategoryRepository", () => {
  it("lists categories by sort order", async () => {
    const cats = await new DrizzleCategoryRepository(handle.db).list();
    expect(cats.map((c) => c.id)).toEqual(["cat-1", "cat-2"]);
  });
});
