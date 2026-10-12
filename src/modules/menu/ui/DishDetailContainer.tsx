"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRepositories } from "@/config/useRepositories";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { EmptyState, ErrorNote, Skeleton } from "@/shared/ui/feedback";
import { Stepper } from "@/shared/ui/Stepper";
import { Textarea } from "@/shared/ui/Field";
import { formatMoney } from "@/shared/lib/money";
import { useResource } from "@/shared/lib/useResource";
import { useCart } from "@/modules/orders/ui/CartProvider";
import { allergenLabel, hasArModel } from "../domain/dish";
import type { Dish } from "../domain/types";
import { recallDish } from "./dishCache";
import { DishViewer } from "./DishViewer";
import { SizeGuide } from "./SizeGuide";

/** Container for /menu/[slug]: loads the dish, tracks views / AR launches, adds to the order. */
export function DishDetailContainer({ slug }: { slug: string }) {
  const { dishes, analytics } = useRepositories();
  const router = useRouter();
  const search = useSearchParams();
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [added, setAdded] = useState(false);

  const load = useCallback(() => dishes.getBySlug(slug), [dishes, slug]);
  // Seeded from the catalog the menu already loaded, so the card image can morph into the viewer.
  const [seed] = useState(() => recallDish(slug));
  const { data: dish, loading, error } = useResource(load, { initialData: seed ?? undefined });

  const trackedView = useRef<string | null>(null);
  useEffect(() => {
    if (dish && trackedView.current !== dish.id) {
      trackedView.current = dish.id;
      void analytics.trackDishEvent(dish.id, "view");
    }
  }, [dish, analytics]);

  const dishId = dish?.id;
  const onArLaunch = useCallback(() => {
    if (dishId) void analytics.trackDishEvent(dishId, "ar_launch");
  }, [analytics, dishId]);

  if (loading) {
    return (
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (error) return <ErrorNote>No se pudo cargar este plato. Inténtalo de nuevo.</ErrorNote>;
  if (!dish) {
    return (
      <EmptyState
        title="No encontramos ese plato"
        description="Es posible que se haya retirado del menú."
        action={
          <Button onClick={() => router.push("/menu")} variant="secondary">
            Volver al menú
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/menu" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted transition-colors hover:text-ink">
        <ArrowLeft size={16} aria-hidden /> Menú
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        <DishViewer dish={dish} promptAr={search.get("ar") === "1"} onArLaunch={onArLaunch} morph />

        <div className="reveal-stagger space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {hasArModel(dish) ? <Badge tone="accent">Realidad aumentada</Badge> : null}
              {dish.isFeatured ? <Badge>Recomendado del chef</Badge> : null}
            </div>
            <h1 className="font-display text-4xl leading-tight">{dish.name}</h1>
            <p className="text-2xl font-medium tabular-nums">{formatMoney(dish.priceCents)}</p>
            <p className="text-muted">{dish.description}</p>
          </header>

          <DimensionsPanel dish={dish} />

          {dish.allergens.length > 0 ? (
            <section aria-label="Alérgenos" className="space-y-2">
              <h2 className="text-sm font-medium">Contiene</h2>
              <ul className="flex flex-wrap gap-2">
                {dish.allergens.map((a) => (
                  <li key={a}>
                    <Badge tone="amber">{allergenLabel(a)}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <Card className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Cantidad</span>
              <Stepper label="cantidad" value={quantity} onChange={setQuantity} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="dish-notes" className="text-sm font-medium">
                Notas <span className="font-normal text-muted">(opcional)</span>
              </label>
              <Textarea
                id="dish-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={200}
                placeholder="Sin cebolla, salsa extra..."
                className="min-h-20"
              />
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                cart.add({ dishId: dish.id, name: dish.name, unitPriceCents: dish.priceCents }, quantity, notes);
                setAdded(true);
                setQuantity(1);
                setNotes("");
                cart.openDrawer();
                setTimeout(() => setAdded(false), 1500);
              }}
            >
              {added ? "Agregado a tu pedido" : `Agregar al pedido · ${formatMoney(dish.priceCents * quantity)}`}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DimensionsPanel({ dish }: { dish: Dish }) {
  const rows: Array<[string, string]> = [];
  if (dish.diameterCm) rows.push(["Diámetro", `${dish.diameterCm} cm`]);
  if (dish.heightCm) rows.push(["Altura", `${dish.heightCm} cm`]);
  if (dish.weightG) rows.push(["Peso", `${dish.weightG} g`]);
  if (dish.serves) rows.push(["Porciones", String(dish.serves)]);
  if (rows.length === 0) return null;
  return (
    <section aria-label="Dimensiones" className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
      <dl className="grid grid-cols-2 gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-[10px] border border-line bg-surface px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {dish.diameterCm ? (
        <div className="sm:w-44">
          <SizeGuide diameterCm={dish.diameterCm} />
        </div>
      ) : null}
    </section>
  );
}
