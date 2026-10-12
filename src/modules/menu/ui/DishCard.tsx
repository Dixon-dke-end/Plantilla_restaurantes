import Link from "next/link";
import { ViewTransition } from "react";
import { Check, Plus } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { Img } from "@/shared/ui/Img";
import { formatMoney } from "@/shared/lib/money";
import { dishTransitionName, hasArModel } from "../domain/dish";
import type { Dish } from "../domain/types";

/** Presentational card. Navigation is a link; the quick-add is a separate button. */
export function DishCard({
  dish,
  onQuickAdd,
  justAdded,
}: {
  dish: Dish;
  onQuickAdd: (dish: Dish) => void;
  justAdded?: boolean;
}) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[14px] border border-line bg-surface transition-colors hover:border-ink/25">
      <Link href={`/menu/${dish.slug}`} className="block" aria-label={`${dish.name}, ${formatMoney(dish.priceCents)}`}>
        {/* Shared element: the same name on the dish page morphs this image into the viewer. */}
        <ViewTransition name={dishTransitionName(dish.slug)} share="morph" default="none">
          <div className="relative aspect-[4/3] overflow-hidden bg-paper">
            <Img
              src={dish.imageUrl}
              alt=""
              fallbackLabel={dish.name}
              className="size-full transition-transform duration-300 group-hover:scale-[1.03]"
            />
            {hasArModel(dish) ? (
              <Badge tone="neutral" className="absolute left-3 top-3 bg-surface/95 text-ink shadow-sm">
                AR
              </Badge>
            ) : null}
          </div>
        </ViewTransition>
        <div className="space-y-1 p-4 pb-2">
          <h3 className="font-display text-lg leading-snug">{dish.name}</h3>
          <p className="line-clamp-2 text-sm text-muted">{dish.description}</p>
        </div>
      </Link>
      <div className="mt-auto flex items-center justify-between gap-3 p-4 pt-2">
        <p className="font-medium tabular-nums">{formatMoney(dish.priceCents)}</p>
        <button
          type="button"
          onClick={() => onQuickAdd(dish)}
          aria-label={`Agregar ${dish.name} a tu pedido`}
          className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-accent hover:text-accent"
        >
          {justAdded ? <Check size={18} aria-hidden className="text-olive" /> : <Plus size={18} aria-hidden />}
        </button>
      </div>
    </article>
  );
}
