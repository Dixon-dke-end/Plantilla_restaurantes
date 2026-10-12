import { z } from "zod";
import { SLUG_PATTERN } from "@/modules/menu/domain/slug";
import { ORDER_STATUSES } from "@/modules/orders/domain/types";

// Built-in zod messages (too small, invalid email...) are shown to the user, so they are Spanish.
z.config(z.locales.es());

const text = (max: number) => z.string().trim().max(max);

/* ----------------------------- orders ----------------------------- */

export const placeOrderBodySchema = z.object({
  items: z
    .array(
      z.object({
        dishId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(99),
        notes: text(200).default(""),
      }),
    )
    .min(1)
    .max(50),
  fulfillment: z.discriminatedUnion("type", [
    z.object({ type: z.literal("dine_in"), table: text(12) }),
    z.object({ type: z.literal("pickup") }),
  ]),
  customerName: text(60).default(""),
  notes: text(500).default(""),
  source: z.enum(["customer", "staff"]).default("customer"),
});
export type PlaceOrderBody = z.infer<typeof placeOrderBodySchema>;

export const orderStatusBodySchema = z.object({ status: z.enum(ORDER_STATUSES) });

const statusList = z
  .string()
  .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean))
  .pipe(z.array(z.enum(ORDER_STATUSES)).min(1));

const isoDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), "Fecha no válida")
  .transform((s) => new Date(s));

export const ordersQuerySchema = z
  .object({ status: statusList.optional(), from: isoDate.optional(), to: isoDate.optional() })
  .transform(({ status, from, to }) => ({
    ...(status ? { statuses: status } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }));

/* ------------------------------ menu ------------------------------ */

/** Either an uploaded file (/media/...) or a remote http(s) URL. Blocks javascript:, data: etc. */
const mediaUrl = z
  .string()
  .max(2048)
  .refine((v) => v.startsWith("/media/") || /^https?:\/\//i.test(v), "Debe ser un archivo subido o una URL http(s)")
  .nullable();

const positiveNumber = (max: number) => z.number().positive().max(max).nullable();

export const dishBodySchema = z.object({
  slug: z.string().max(120).regex(SLUG_PATTERN, "Usa minúsculas, números y guiones"),
  name: text(120).min(1),
  description: text(2000),
  priceCents: z.number().int().min(0).max(10_000_000),
  categoryId: z.string().min(1).max(100),
  imageUrl: mediaUrl,
  modelGlbUrl: mediaUrl,
  modelUsdzUrl: mediaUrl,
  diameterCm: positiveNumber(500),
  heightCm: positiveNumber(500),
  weightG: z.number().int().positive().max(100_000).nullable(),
  serves: z.number().int().min(1).max(100).nullable(),
  modelScale: z.number().positive().max(1000),
  allergens: z.array(text(30)).max(20),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
});

export const dishPatchBodySchema = dishBodySchema.partial();

export const dishEventBodySchema = z.object({
  dishId: z.string().min(1).max(100),
  kind: z.enum(["view", "ar_launch"]),
});

export const eventsQuerySchema = z.object({
  since: isoDate.optional(),
});

/* ------------------------------ team ------------------------------ */

export const teamCreateBodySchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(10).max(128),
  fullName: text(80).min(1),
  role: z.enum(["employee", "admin"]),
});

export const roleBodySchema = z.object({ role: z.enum(["customer", "employee", "admin"]) });
