import { getContainer } from "@/server/container";
import { HttpError } from "@/server/http/errors";
import { json, route } from "@/server/http/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: one available dish by slug. */
export const GET = route(async (_request: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const dish = await (await getContainer()).dishes.getBySlug(slug);
  if (!dish || !dish.isAvailable) throw new HttpError(404, "No se encontró el plato.");
  return json(dish);
});
