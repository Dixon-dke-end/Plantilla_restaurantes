import { NotFoundError } from "@/shared/lib/appErrors";
import type { ApiClient } from "@/shared/lib/http";
import type { CategoryRepository, DishRepository, ListDishesOptions, MediaKind, MediaStorage } from "../../domain/ports";
import type { Category, Dish, DishInput, DishPatch } from "../../domain/types";

const toInput = (dish: Dish): DishInput => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdAt, updatedAt, ...input } = dish;
  return input;
};

/** Browser-side DishRepository talking to the Next.js route handlers. */
export class HttpDishRepository implements DishRepository {
  constructor(private readonly api: ApiClient) {}

  async list(options: ListDishesOptions = {}): Promise<Dish[]> {
    if (options.includeUnavailable) return this.api.get<Dish[]>("/api/admin/dishes");
    return (await this.api.get<{ dishes: Dish[] }>("/api/menu")).dishes;
  }

  getBySlug(slug: string): Promise<Dish | null> {
    return this.api.getOrNull<Dish>(`/api/dishes/${encodeURIComponent(slug)}`);
  }

  getById(id: string): Promise<Dish | null> {
    return this.api.getOrNull<Dish>(`/api/admin/dishes/${encodeURIComponent(id)}`);
  }

  create(input: DishInput): Promise<Dish> {
    return this.api.post<Dish>("/api/admin/dishes", input);
  }

  async update(id: string, patch: DishPatch): Promise<Dish> {
    const current = await this.getById(id);
    if (!current) throw new NotFoundError("No se encontró el plato.");
    return this.api.put<Dish>(`/api/admin/dishes/${encodeURIComponent(id)}`, { ...toInput(current), ...patch });
  }

  async remove(id: string): Promise<void> {
    await this.api.del(`/api/admin/dishes/${encodeURIComponent(id)}`);
  }
}

export class HttpCategoryRepository implements CategoryRepository {
  constructor(private readonly api: ApiClient) {}

  list(): Promise<Category[]> {
    return this.api.get<Category[]>("/api/categories");
  }
}

export class HttpMediaStorage implements MediaStorage {
  constructor(private readonly api: ApiClient) {}

  async upload(file: File | Blob, kind: MediaKind, fileName?: string): Promise<string> {
    const form = new FormData();
    form.append("file", file, fileName ?? (file instanceof File ? file.name : "upload"));
    form.append("kind", kind);
    return (await this.api.postForm<{ url: string }>("/api/admin/media", form)).url;
  }

  async remove(url: string): Promise<void> {
    await this.api.del(`/api/admin/media?url=${encodeURIComponent(url)}`);
  }
}
