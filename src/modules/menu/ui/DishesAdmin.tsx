"use client";

import Link from "next/link";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useRepositories } from "@/config/useRepositories";
import { formatMoney } from "@/shared/lib/money";
import { useResource } from "@/shared/lib/useResource";
import { Badge } from "@/shared/ui/Badge";
import { Button, LinkButton } from "@/shared/ui/Button";
import { Dialog } from "@/shared/ui/Dialog";
import { EmptyState, ErrorNote, Skeleton } from "@/shared/ui/feedback";
import { Input, Select } from "@/shared/ui/Field";
import { Img } from "@/shared/ui/Img";
import { Toggle } from "@/shared/ui/Toggle";
import { hasArModel } from "../domain/dish";
import type { Dish } from "../domain/types";

/** Container for /admin/dishes: searchable table with availability/featured toggles and delete. */
export function DishesAdmin() {
  const { dishes, categories } = useRepositories();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [toDelete, setToDelete] = useState<Dish | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [cats, items] = await Promise.all([categories.list(), dishes.list({ includeUnavailable: true })]);
    return { cats, items };
  }, [categories, dishes]);
  const { data, error, reload } = useResource(load);

  const catName = useMemo(() => new Map((data?.cats ?? []).map((c) => [c.id, c.name])), [data]);
  const rows = useMemo(
    () =>
      (data?.items ?? []).filter(
        (d) =>
          (category === "all" || d.categoryId === category) &&
          (!query.trim() || d.name.toLowerCase().includes(query.trim().toLowerCase())),
      ),
    [data, query, category],
  );

  async function patch(dish: Dish, change: Partial<Pick<Dish, "isAvailable" | "isFeatured">>) {
    setActionError(null);
    try {
      await dishes.update(dish.id, change);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo actualizar el plato.");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await dishes.remove(toDelete.id);
      setToDelete(null);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo eliminar el plato.");
      setToDelete(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Platos</h1>
          <p className="text-sm text-muted">Administra el menú y el modelo 3D de cada plato.</p>
        </div>
        <LinkButton href="/admin/dishes/new">
          <Plus size={16} aria-hidden /> Nuevo plato
        </LinkButton>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <Input aria-label="Buscar platos" placeholder="Buscar platos" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
        <Select aria-label="Filtrar por categoría" value={category} onChange={(e) => setCategory(e.target.value)} className="w-48">
          <option value="all">Todas las categorías</option>
          {(data?.cats ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {error ? <ErrorNote>No se pudieron cargar los platos: {error.message}</ErrorNote> : null}
      {actionError ? <ErrorNote>{actionError}</ErrorNote> : null}
      {!data && !error ? <Skeleton className="h-80" /> : null}
      {data && rows.length === 0 ? <EmptyState title="No se encontraron platos" description="Prueba con otra búsqueda o filtro." /> : null}

      {data && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-surface">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Plato</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 text-right font-medium">Precio</th>
                <th className="px-4 py-3 font-medium">AR</th>
                <th className="px-4 py-3 font-medium">Disponible</th>
                <th className="px-4 py-3 font-medium">Destacado</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((dish) => (
                <tr key={dish.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Img src={dish.imageUrl} alt="" fallbackLabel={dish.name.slice(0, 2)} className="size-12 shrink-0 rounded-[10px]" />
                      <Link href={`/admin/dishes/${dish.id}`} className="font-medium hover:underline">
                        {dish.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{catName.get(dish.categoryId) ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(dish.priceCents)}</td>
                  <td className="px-4 py-3">
                    {hasArModel(dish) ? <Badge tone="olive">Modelo ✓</Badge> : <Badge tone="amber">Sin modelo</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <Toggle checked={dish.isAvailable} onChange={(v) => patch(dish, { isAvailable: v })} label={`${dish.name}: disponible`} />
                  </td>
                  <td className="px-4 py-3">
                    <Toggle checked={dish.isFeatured} onChange={(v) => patch(dish, { isFeatured: v })} label={`${dish.name}: destacado`} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/dishes/${dish.id}`}
                        aria-label={`Editar ${dish.name}`}
                        className="grid size-11 place-items-center rounded-[10px] text-muted hover:bg-ink/[.06] hover:text-ink"
                      >
                        <Pencil size={16} aria-hidden />
                      </Link>
                      <button
                        type="button"
                        aria-label={`Eliminar ${dish.name}`}
                        onClick={() => setToDelete(dish)}
                        className="grid size-11 place-items-center rounded-[10px] text-muted hover:bg-red-soft hover:text-red"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Dialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="¿Eliminar este plato?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Conservar
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Eliminar plato
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          {toDelete ? `«${toDelete.name}»` : ""} se quitará del menú. Las órdenes anteriores conservan sus platos. Esta acción no se puede deshacer.
        </p>
      </Dialog>
    </div>
  );
}
