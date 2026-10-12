"use client";

import { useCallback } from "react";
import { useRepositories } from "@/config/useRepositories";
import { LinkButton } from "@/shared/ui/Button";
import { EmptyState, ErrorNote, Skeleton } from "@/shared/ui/feedback";
import { useResource } from "@/shared/lib/useResource";
import { DishForm } from "./DishForm";

/** Container for /admin/dishes/new and /admin/dishes/[id]: loads categories (and the dish) then mounts the form. */
export function DishEditor({ dishId }: { dishId?: string }) {
  const { dishes, categories } = useRepositories();
  const load = useCallback(async () => {
    const [cats, dish] = await Promise.all([categories.list(), dishId ? dishes.getById(dishId) : Promise.resolve(null)]);
    return { cats, dish };
  }, [categories, dishes, dishId]);
  const { data, error } = useResource(load);

  if (error) return <ErrorNote>No se pudo cargar el plato: {error.message}</ErrorNote>;
  if (!data) return <Skeleton className="h-96" />;
  if (dishId && !data.dish) {
    return (
      <EmptyState
        title="Plato no encontrado"
        action={
          <LinkButton href="/admin/dishes" variant="secondary">
            Volver a los platos
          </LinkButton>
        }
      />
    );
  }
  return <DishForm key={data.dish?.id ?? "new"} initial={data.dish} categories={data.cats} />;
}
