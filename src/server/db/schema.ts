import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/* ------------------------------------------------------------------ */
/* Auth (better-auth core tables + a `role` column)                    */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** customer | employee | admin */
  role: text("role").notNull().default("customer"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: ts("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: ts("access_token_expires_at"),
    refreshTokenExpiresAt: ts("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Menu                                                                */
/* ------------------------------------------------------------------ */

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sort: integer("sort").notNull().default(0),
});

export const dishes = pgTable(
  "dishes",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    imageUrl: text("image_url"),
    modelGlbUrl: text("model_glb_url"),
    modelUsdzUrl: text("model_usdz_url"),
    /** Real-world dimensions used to calibrate the 3D model. */
    diameterCm: doublePrecision("diameter_cm"),
    heightCm: doublePrecision("height_cm"),
    weightG: integer("weight_g"),
    serves: integer("serves"),
    modelScale: doublePrecision("model_scale").notNull().default(1),
    allergens: text("allergens")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    isAvailable: boolean("is_available").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("dishes_category_idx").on(t.categoryId)],
);

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export const orderStatus = pgEnum("order_status", ["pending", "preparing", "ready", "served", "cancelled"]);
export const orderSource = pgEnum("order_source", ["customer", "staff"]);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    /** Monotonic sequence behind the short human code ("A-042"). */
    seq: integer("seq").notNull().unique().generatedByDefaultAsIdentity(),
    status: orderStatus("status").notNull().default("pending"),
    source: orderSource("source").notNull().default("customer"),
    tableLabel: text("table_label").notNull().default(""),
    customerName: text("customer_name").notNull().default(""),
    notes: text("notes").notNull().default(""),
    totalCents: integer("total_cents").notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    preparingAt: ts("preparing_at"),
    readyAt: ts("ready_at"),
    servedAt: ts("served_at"),
    cancelledAt: ts("cancelled_at"),
  },
  (t) => [index("orders_created_at_idx").on(t.createdAt), index("orders_status_idx").on(t.status)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    dishId: text("dish_id").references(() => dishes.id, { onDelete: "set null" }),
    /** Snapshots: the order stays accurate when a dish is renamed, repriced or deleted. */
    dishName: text("dish_name").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    notes: text("notes").notNull().default(""),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

export const dishEvents = pgTable(
  "dish_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    dishId: text("dish_id")
      .notNull()
      .references(() => dishes.id, { onDelete: "cascade" }),
    /** view | ar_launch */
    kind: text("kind").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("dish_events_created_at_idx").on(t.createdAt), index("dish_events_dish_idx").on(t.dishId)],
);
