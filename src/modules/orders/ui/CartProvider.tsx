"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  addToCart,
  cartItemCount,
  cartSubtotalCents,
  removeLine,
  setLineNotes,
  setLineQuantity,
  type Cart,
  type CartDish,
} from "../domain/cart";
import { cartStore, lastOrder } from "./cartStore";

type CartApi = {
  lines: Cart;
  count: number;
  subtotalCents: number;
  add: (dish: CartDish, quantity?: number, notes?: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  setNotes: (key: string, notes: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  checkoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
};

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const add = useCallback(
    (dish: CartDish, quantity = 1, notes = "") => cartStore.write(addToCart(cartStore.getSnapshot(), dish, quantity, notes)),
    [],
  );
  const setQuantity = useCallback(
    (key: string, q: number) => cartStore.write(setLineQuantity(cartStore.getSnapshot(), key, q)),
    [],
  );
  const setNotes = useCallback(
    (key: string, notes: string) => cartStore.write(setLineNotes(cartStore.getSnapshot(), key, notes)),
    [],
  );
  const remove = useCallback((key: string) => cartStore.write(removeLine(cartStore.getSnapshot(), key)), []);
  const clear = useCallback(() => cartStore.write([]), []);

  const value = useMemo<CartApi>(
    () => ({
      lines,
      count: cartItemCount(lines),
      subtotalCents: cartSubtotalCents(lines),
      add,
      setQuantity,
      setNotes,
      remove,
      clear,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      checkoutOpen,
      openCheckout: () => {
        setDrawerOpen(false);
        setCheckoutOpen(true);
      },
      closeCheckout: () => setCheckoutOpen(false),
    }),
    [lines, add, setQuantity, setNotes, remove, clear, drawerOpen, checkoutOpen],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>.");
  return ctx;
}

export function useLastOrderId(): string | null {
  return useSyncExternalStore(lastOrder.subscribe, lastOrder.get, lastOrder.getServerSnapshot);
}
