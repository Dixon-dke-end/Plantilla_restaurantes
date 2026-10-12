import type { Cart, CartLine } from "../domain/cart";

const CART_KEY = "ember.cart";
const LAST_ORDER_KEY = "ember.lastOrderId";

const EMPTY: Cart = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedCart: Cart = EMPTY;

const isLine = (v: unknown): v is CartLine => {
  if (!v || typeof v !== "object") return false;
  const l = v as Record<string, unknown>;
  return (
    typeof l.dishId === "string" &&
    typeof l.name === "string" &&
    typeof l.unitPriceCents === "number" &&
    typeof l.quantity === "number" &&
    typeof l.notes === "string"
  );
};

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Snapshot must be referentially stable between unchanged reads (useSyncExternalStore contract). */
function getSnapshot(): Cart {
  const raw = storage()?.getItem(CART_KEY) ?? null;
  if (raw === cachedRaw) return cachedCart;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedCart = Array.isArray(parsed) ? parsed.filter(isLine) : EMPTY;
  } catch {
    cachedCart = EMPTY;
  }
  return cachedCart;
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot,
  getServerSnapshot: (): Cart => EMPTY,
  write(cart: Cart) {
    try {
      storage()?.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* storage unavailable: the cart simply will not persist */
    }
    listeners.forEach((l) => l());
  },
};

/** Remembers the last order so the header's "Order status" link can reopen it. */
export const lastOrder = {
  get(): string | null {
    try {
      return storage()?.getItem(LAST_ORDER_KEY) ?? null;
    } catch {
      return null;
    }
  },
  set(id: string) {
    try {
      storage()?.setItem(LAST_ORDER_KEY, id);
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  },
  subscribe: (listener: () => void) => cartStore.subscribe(listener),
  getServerSnapshot: (): string | null => null,
};
