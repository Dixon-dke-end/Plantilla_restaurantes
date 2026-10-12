"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart, useLastOrderId } from "@/modules/orders/ui/CartProvider";

/** Sticky, minimal customer header: wordmark, Menú, Estado del pedido and the cart. */
export function SiteHeader() {
  const cart = useCart();
  const lastOrder = useLastOrderId();
  const link = "inline-flex min-h-11 items-center px-2 text-sm font-medium text-ink/80 transition-colors hover:text-ink sm:px-3";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur" style={{ viewTransitionName: "site-header" }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" className="font-display text-xl tracking-tight sm:text-2xl" aria-label="Ember & Salt, inicio">
          Ember <span className="text-accent">&amp;</span> Salt
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-0.5 sm:gap-1">
          <Link href="/menu" className={link}>
            Menú
          </Link>
          <Link href={lastOrder ? `/order/${lastOrder}` : "/order"} className={link}>
            <span className="sm:hidden">Estado</span>
            <span className="hidden sm:inline">Estado del pedido</span>
          </Link>
          <Link href="/login" className="hidden min-h-11 items-center px-3 text-xs text-muted transition-colors hover:text-ink md:inline-flex">
            Personal
          </Link>
          <button
            type="button"
            onClick={cart.openDrawer}
            aria-label={`Abrir tu pedido, ${cart.count} ${cart.count === 1 ? "plato" : "platos"}`}
            className="relative ml-1 grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[.06]"
          >
            <ShoppingBag size={22} aria-hidden />
            {cart.count > 0 ? (
              <span className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold leading-5 text-on-accent tabular-nums">
                {cart.count}
              </span>
            ) : null}
          </button>
        </nav>
      </div>
    </header>
  );
}
