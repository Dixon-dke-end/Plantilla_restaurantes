"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRepositories } from "@/config/useRepositories";
import { Button } from "@/shared/ui/Button";
import { Dialog } from "@/shared/ui/Dialog";
import { ErrorNote } from "@/shared/ui/feedback";
import { Field, Input, Textarea } from "@/shared/ui/Field";
import { cn } from "@/shared/ui/cn";
import { formatMoney } from "@/shared/lib/money";
import { OrderValidationError, placeOrder } from "../application/placeOrder";
import type { Fulfillment } from "../domain/fulfillment";
import { useCart } from "./CartProvider";
import { lastOrder } from "./cartStore";

/** Container: collects table/pickup details and places the order through the use case. */
export function CheckoutDialog() {
  const cart = useCart();
  const repos = useRepositories();
  const router = useRouter();
  const [mode, setMode] = useState<Fulfillment["type"]>("dine_in");
  const [table, setTable] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const fulfillment: Fulfillment = mode === "dine_in" ? { type: "dine_in", table } : { type: "pickup" };
      const placed = await placeOrder(
        { orders: repos.orders, dishes: repos.dishes },
        {
          items: cart.lines.map((l) => ({ dishId: l.dishId, quantity: l.quantity, notes: l.notes })),
          fulfillment,
          customerName: name,
          notes,
          source: "customer",
        },
      );
      lastOrder.set(placed.id);
      cart.clear();
      cart.closeCheckout();
      router.push(`/order/${placed.id}`);
    } catch (error) {
      if (error instanceof OrderValidationError) {
        const next: Record<string, string> = {};
        for (const issue of error.issues) next[issue.field] = next[issue.field] ?? issue.message;
        setFieldErrors(next);
        if (next.items) setFormError(next.items);
      } else {
        setFormError(error instanceof Error ? error.message : "No se pudo realizar el pedido.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={cart.checkoutOpen} onClose={cart.closeCheckout} title="Finalizar pedido">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div role="radiogroup" aria-label="¿Cómo deseas recibir tu pedido?" className="grid grid-cols-2 gap-2">
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
                "min-h-12 rounded-[10px] border text-sm font-medium transition-colors",
                mode === value ? "border-ink bg-ink text-paper" : "border-line bg-surface text-muted hover:border-ink/30",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "dine_in" ? (
          <Field label="Número de mesa" error={fieldErrors.table} hint="Está impreso en tu mesa.">
            {(p) => (
              <Input {...p} value={table} onChange={(e) => setTable(e.target.value)} inputMode="numeric" maxLength={12} autoComplete="off" />
            )}
          </Field>
        ) : null}

        <Field label={mode === "pickup" ? "Nombre para el pedido" : "Nombre (opcional)"} error={fieldErrors.customerName}>
          {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="given-name" />}
        </Field>

        <Field label="Notas para la cocina (opcional)" hint="Alergias, tiempos o cualquier indicación importante.">
          {(p) => <Textarea {...p} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />}
        </Field>

        {formError ? <ErrorNote>{formError}</ErrorNote> : null}

        <Button type="submit" size="lg" className="w-full" disabled={submitting || cart.lines.length === 0}>
          {submitting ? "Realizando pedido..." : `Realizar pedido · ${formatMoney(cart.subtotalCents)}`}
        </Button>
        <p className="text-center text-xs text-muted">El restaurante confirma los precios finales al registrar el pedido.</p>
      </form>
    </Dialog>
  );
}
