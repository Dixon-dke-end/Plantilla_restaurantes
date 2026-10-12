"use client";

import { useCallback, useState } from "react";
import { useRepositories } from "@/config/useRepositories";
import { Skeleton } from "@/shared/ui/feedback";
import { useResource } from "@/shared/lib/useResource";
import { useCart } from "@/modules/orders/ui/CartProvider";
import { recallCatalog, rememberCatalog } from "./dishCache";
import { DishCard } from "./DishCard";

/** Container for the landing page's featured row. */
export function FeaturedDishes() {
  const { dishes, categories } = useRepositories();
  const cart = useCart();
  const load = useCallback(async () => {
    const [cats, items] = await Promise.all([categories.list(), dishes.list()]);
    rememberCatalog({ cats, items });
    return items.filter((d) => d.isFeatured).slice(0, 4);
  }, [categories, dishes]);
  // Seeded from the last catalog this browser loaded, so returning from a dish can morph back.
  const [seed] = useState(() => recallCatalog()?.items.filter((d) => d.isFeatured).slice(0, 4));
  const { data } = useResource(load, { initialData: seed });

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    );
  }
  if (data.length === 0) return null;
  return (
    <div className="reveal-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.map((dish) => (
        <DishCard
          key={dish.id}
          dish={dish}
          onQuickAdd={(d) => {
            cart.add({ dishId: d.id, name: d.name, unitPriceCents: d.priceCents });
            cart.openDrawer();
          }}
        />
      ))}
    </div>
  );
}
