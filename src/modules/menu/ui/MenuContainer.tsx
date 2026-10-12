"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRepositories } from "@/config/useRepositories";
import { ErrorNote, EmptyState, Skeleton } from "@/shared/ui/feedback";
import { Tabs } from "@/shared/ui/Tabs";
import { useResource } from "@/shared/lib/useResource";
import { useCart } from "@/modules/orders/ui/CartProvider";
import { groupByCategory } from "../application/menuUseCases";
import { hasArModel } from "../domain/dish";
import type { Dish } from "../domain/types";
import { recallCatalog, rememberCatalog } from "./dishCache";
import { DishCard } from "./DishCard";

const ALL = "all";
const AR = "ar";

/** Container for /menu: loads the catalog, filters by category, adds to the cart. */
export function MenuContainer() {
  const { dishes, categories } = useRepositories();
  const cart = useCart();
  const search = useSearchParams();
  const [category, setCategory] = useState<string>(search.get("ar") === "1" ? AR : ALL);
  const [added, setAdded] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const [cats, items] = await Promise.all([categories.list(), dishes.list()]);
    rememberCatalog({ cats, items });
    return { cats, items };
  }, [categories, dishes]);
  // Seeded from the last catalog this browser loaded, so coming back from a dish can morph back.
  const [seed] = useState(recallCatalog);
  const { data, error } = useResource(load, { initialData: seed });

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const groups = useMemo(() => (data ? groupByCategory(data.cats, data.items) : []), [data]);
  const hasAr = (data?.items ?? []).some(hasArModel);
  const visible = useMemo(() => {
    if (category === ALL) return groups;
    if (category === AR) {
      return groups
        .map((g) => ({ ...g, dishes: g.dishes.filter(hasArModel) }))
        .filter((g) => g.dishes.length > 0);
    }
    return groups.filter((g) => g.category.id === category);
  }, [groups, category]);

  function quickAdd(dish: Dish) {
    cart.add({ dishId: dish.id, name: dish.name, unitPriceCents: dish.priceCents });
    setAdded(dish.id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(null), 1200);
  }

  if (error) return <ErrorNote>No se pudo cargar el menú. Actualiza la página.</ErrorNote>;

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="sticky top-16 z-20 -mx-4 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:px-3">
        <Tabs
          label="Categorías del menú"
          value={category}
          onChange={setCategory}
          items={[
            { value: ALL, label: "Todo" },
            ...(hasAr ? [{ value: AR, label: "Platos AR" }] : []),
            ...groups.map((g) => ({ value: g.category.id, label: g.category.name })),
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState title="Aún no hay nada aquí" description="El menú se está actualizando. Vuelve pronto." />
      ) : (
        visible.map((group) => (
          <section key={group.category.id} aria-labelledby={`cat-${group.category.id}`} className="space-y-4">
            <h2 id={`cat-${group.category.id}`} className="reveal font-display text-2xl">
              {group.category.name}
            </h2>
            <div className="reveal-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.dishes.map((dish) => (
                <DishCard key={dish.id} dish={dish} onQuickAdd={quickAdd} justAdded={added === dish.id} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
