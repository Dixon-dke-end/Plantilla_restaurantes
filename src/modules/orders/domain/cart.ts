export type CartLine = {
  dishId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes: string;
};

export type Cart = CartLine[];

export type CartDish = { dishId: string; name: string; unitPriceCents: number };

export const MAX_LINE_QUANTITY = 99;

const normalizeNotes = (notes: string) => notes.trim().replace(/\s+/g, " ");

/** Lines are identified by dish + normalized notes (case-insensitive). */
export const lineKey = (line: Pick<CartLine, "dishId" | "notes">): string =>
  `${line.dishId}::${normalizeNotes(line.notes).toLowerCase()}`;

const clampQuantity = (q: number) => Math.min(MAX_LINE_QUANTITY, Math.floor(q));

export function addToCart(cart: Cart, dish: CartDish, quantity = 1, notes = ""): Cart {
  if (!Number.isFinite(quantity) || quantity < 1) return cart;
  const line: CartLine = {
    dishId: dish.dishId,
    name: dish.name,
    unitPriceCents: dish.unitPriceCents,
    quantity: clampQuantity(quantity),
    notes: normalizeNotes(notes),
  };
  const key = lineKey(line);
  const index = cart.findIndex((l) => lineKey(l) === key);
  if (index === -1) return [...cart, line];
  return cart.map((l, i) => (i === index ? { ...l, quantity: clampQuantity(l.quantity + line.quantity) } : l));
}

export function setLineQuantity(cart: Cart, key: string, quantity: number): Cart {
  if (!Number.isFinite(quantity) || quantity < 1) return removeLine(cart, key);
  return cart.map((l) => (lineKey(l) === key ? { ...l, quantity: clampQuantity(quantity) } : l));
}

export function setLineNotes(cart: Cart, key: string, notes: string): Cart {
  const target = cart.find((l) => lineKey(l) === key);
  if (!target) return cart;
  const updated: CartLine = { ...target, notes: normalizeNotes(notes) };
  const rest = cart.filter((l) => lineKey(l) !== key);
  const newKey = lineKey(updated);
  const collision = rest.findIndex((l) => lineKey(l) === newKey);
  if (collision === -1) return cart.map((l) => (lineKey(l) === key ? updated : l));
  return rest.map((l, i) =>
    i === collision ? { ...l, quantity: clampQuantity(l.quantity + updated.quantity) } : l,
  );
}

export function removeLine(cart: Cart, key: string): Cart {
  return cart.filter((l) => lineKey(l) !== key);
}

export const lineTotalCents = (line: CartLine): number => line.unitPriceCents * line.quantity;
export const cartSubtotalCents = (cart: Cart): number => cart.reduce((s, l) => s + lineTotalCents(l), 0);
export const cartItemCount = (cart: Cart): number => cart.reduce((s, l) => s + l.quantity, 0);
