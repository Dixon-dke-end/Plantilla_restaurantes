export type Category = {
  id: string;
  name: string;
  slug: string;
  sort: number;
};

export type Dish = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  categoryId: string;
  imageUrl: string | null;
  modelGlbUrl: string | null;
  modelUsdzUrl: string | null;
  /** Real-world footprint of the dish in centimetres (plate diameter / longest side). */
  diameterCm: number | null;
  /** Real-world height in centimetres. */
  heightCm: number | null;
  weightG: number | null;
  serves: number | null;
  /** Uniform factor applied to the 3D model so it renders at real-world size. */
  modelScale: number;
  allergens: string[];
  isAvailable: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DishInput = Omit<Dish, "id" | "createdAt" | "updatedAt">;

export type DishPatch = Partial<DishInput>;

export type SizeMeters = { x: number; y: number; z: number };
