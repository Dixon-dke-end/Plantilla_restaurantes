"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useRepositories } from "@/config/useRepositories";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { ErrorNote, Skeleton } from "@/shared/ui/feedback";
import { Input } from "@/shared/ui/Field";
import { Tabs } from "@/shared/ui/Tabs";
import { cn } from "@/shared/ui/cn";
import { formatMoney } from "@/shared/lib/money";
import { useResource } from "@/shared/lib/useResource";
import { useAuth } from "@/modules/auth/ui/AuthProvider";
import { OrderValidationError, placeOrder } from "../application/placeOrder";
import {
  addToCart,
  cartItemCount,
  cartSubtotalCents,
  lineKey,
  lineTotalCents,
  removeLine,
  setLineNotes,
  setLineQuantity,
  type Cart,
} from "../domain/cart";
import type { Fulfillment } from "../domain/fulfillment";

const ALL = "all";

/** Container for /staff/new-order: build a ticket on behalf of a customer; it lands on the KDS. */
export function PosScreen() {
  const { dishes, categories, orders } = useRepositories();
  const { user } = useAuth();
  const [category, setCategory] = useState(ALL);
  const [cart, setCart] = useState<Cart>([]);
  const [mode, setMode] = useState<Fulfillment["type"]>("dine_in");
  const [table, setTable] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [cats, items] = await Promise.all([categories.list(), dishes.list()]);
    return { cats, items };
  }, [categories, dishes]);
  const { data } = useResource(load);

  const visible = useMemo(
    () => (data ? data.items.filter((d) => category === ALL || d.categoryId === category) : []),
    [data, category],
  );

  async function send() {
    setSending(true);
    setError(null);
    setSent(null);
    try {
      const fulfillment: Fulfillment = mode === "dine_in" ? { type: "dine_in", table } : { type: "pickup" };
      const placed = await placeOrder(
        { orders, dishes },
        {
          items: cart.map((l) => ({ dishId: l.dishId, quantity: l.quantity, notes: l.notes })),
          fulfillment,
          customerName: name,
          source: "staff",
          createdBy: user?.id ?? null,
        },
      );
      setSent(placed.code);
      setCart([]);
      setTable("");
      setName("");
    } catch (e) {
      setError(e instanceof OrderValidationError ? e.issues.map((i) => i.message).join(" ") : e instanceof Error ? e.message : "No se pudo enviar la orden.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-label="Platos" className="min-w-0 space-y-4">
        <h1 className="font-display text-3xl">Nueva orden</h1>
        {data ? (
          <>
            <Tabs
              size="lg"
              label="Categorías"
              value={category}
              onChange={setCategory}
              items={[{ value: ALL, label: "Todas" }, ...data.cats.map((c) => ({ value: c.id, label: c.name }))]}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((dish) => (
                <button
                  key={dish.id}
                  type="button"
                  onClick={() => setCart((c) => addToCart(c, { dishId: dish.id, name: dish.name, unitPriceCents: dish.priceCents }))}
                  className="flex min-h-28 flex-col justify-between rounded-[14px] border border-line bg-surface p-4 text-left transition-colors hover:border-accent active:bg-accent-soft"
                >
                  <span className="text-lg font-semibold leading-snug">{dish.name}</span>
                  <span className="text-base tabular-nums text-muted">{formatMoney(dish.priceCents)}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <Skeleton className="h-80" />
        )}
      </section>

      <aside aria-label="Ticket" className="h-fit space-y-4 rounded-[14px] border border-line bg-surface p-4 lg:sticky lg:top-20">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de orden">
          {(
            [
              ["dine_in", "Comer aquí"],
              ["pickup", "Para llevar"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "min-h-14 rounded-[10px] border text-base font-semibold transition-colors",
                mode === value ? "border-accent bg-accent text-on-accent" : "border-line text-muted hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {mode === "dine_in" ? (
            <Input
              aria-label="Número de mesa"
              placeholder="Mesa"
              value={table}
              onChange={(e) => setTable(e.target.value)}
              inputMode="numeric"
              maxLength={12}
              className="min-h-14 text-lg"
            />
          ) : (
            <span />
          )}
          <Input
            aria-label="Nombre del cliente"
            placeholder={mode === "pickup" ? "Nombre (obligatorio)" : "Nombre"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="min-h-14 text-lg"
          />
        </div>

        {cart.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-line px-4 py-8 text-center text-muted">Toca un plato para agregarlo</p>
        ) : (
          <ul className="max-h-[42dvh] space-y-3 overflow-y-auto pr-1">
            {cart.map((line) => {
              const key = lineKey(line);
              return (
                <li key={key} className="space-y-2 rounded-[10px] border border-line p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-base font-semibold">{line.name}</p>
                    <p className="tabular-nums">{formatMoney(lineTotalCents(line))}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label={`Disminuir ${line.name}`} onClick={() => setCart((c) => setLineQuantity(c, key, line.quantity - 1))} className="grid size-12 place-items-center rounded-[10px] border border-line">
                      <Minus size={18} aria-hidden />
                    </button>
                    <span className="w-8 text-center text-xl font-bold tabular-nums">{line.quantity}</span>
                    <button type="button" aria-label={`Aumentar ${line.name}`} onClick={() => setCart((c) => setLineQuantity(c, key, line.quantity + 1))} className="grid size-12 place-items-center rounded-[10px] border border-line">
                      <Plus size={18} aria-hidden />
                    </button>
                    <button type="button" aria-label={`Quitar ${line.name}`} onClick={() => setCart((c) => removeLine(c, key))} className="ml-auto grid size-12 place-items-center rounded-[10px] text-red hover:bg-red-soft">
                      <Trash2 size={18} aria-hidden />
                    </button>
                  </div>
                  <Input
                    aria-label={`Notas para ${line.name}`}
                    placeholder="Notas del plato"
                    defaultValue={line.notes}
                    onBlur={(e) => setCart((c) => setLineNotes(c, key, e.target.value))}
                    maxLength={200}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-muted">{cartItemCount(cart)} {cartItemCount(cart) === 1 ? "plato" : "platos"}</span>
          <span className="text-2xl font-bold tabular-nums">{formatMoney(cartSubtotalCents(cart))}</span>
        </div>

        {error ? <ErrorNote>{error}</ErrorNote> : null}
        {sent ? (
          <p role="status" className="flex items-center gap-2 rounded-[10px] bg-olive-soft px-4 py-3 text-olive">
            <Badge tone="olive">Enviado</Badge> El ticket {sent} ya está en el tablero de cocina.
          </p>
        ) : null}

        <Button size="xl" className="w-full" disabled={cart.length === 0 || sending} onClick={send}>
          {sending ? "Enviando..." : "Enviar a cocina"}
        </Button>
      </aside>
    </div>
  );
}
