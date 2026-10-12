"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Drawer } from "@/shared/ui/Dialog";
import { EmptyState } from "@/shared/ui/feedback";
import { Stepper } from "@/shared/ui/Stepper";
import { formatMoney } from "@/shared/lib/money";
import { lineKey, lineTotalCents } from "../domain/cart";
import { useCart } from "./CartProvider";

/** Container: reads and mutates the cart, renders the drawer. */
export function CartDrawer() {
  const cart = useCart();

  return (
    <Drawer
      open={cart.drawerOpen}
      onClose={cart.closeDrawer}
      title="Tu pedido"
      footer={
        cart.lines.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="text-xl font-semibold tabular-nums">{formatMoney(cart.subtotalCents)}</span>
            </div>
            <Button size="lg" className="w-full" onClick={cart.openCheckout}>
              Finalizar pedido
            </Button>
          </div>
        ) : undefined
      }
    >
      {cart.lines.length === 0 ? (
        <EmptyState title="Tu pedido está vacío" description="Agrega algunos platos del menú para comenzar." />
      ) : (
        <ul className="divide-y divide-line">
          {cart.lines.map((line) => {
            const key = lineKey(line);
            return (
              <li key={key} className="space-y-3 py-4 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{line.name}</p>
                    {line.notes ? <p className="text-sm text-muted">{line.notes}</p> : null}
                  </div>
                  <p className="font-medium tabular-nums">{formatMoney(lineTotalCents(line))}</p>
                </div>
                <div className="flex items-center justify-between">
                  <Stepper label={line.name} value={line.quantity} onChange={(q) => cart.setQuantity(key, q)} />
                  <button
                    type="button"
                    onClick={() => cart.remove(key)}
                    aria-label={`Quitar ${line.name}`}
                    className="grid size-11 place-items-center rounded-[10px] text-muted transition-colors hover:bg-red-soft hover:text-red"
                  >
                    <Trash2 size={18} aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}
