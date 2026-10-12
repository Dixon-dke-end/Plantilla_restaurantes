import { saveDish } from "@/modules/menu/application/menuUseCases";
import { getContainer } from "@/server/container";
import { requireRole } from "@/server/auth/session";
import { HttpError } from "@/server/http/errors";
import { json, parseBody, route, type IdContext } from "@/server/http/route";
import { dishBodySchema } from "@/server/http/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request, ctx: IdContext) => {
  await requireRole(request, "admin");
  const { id } = await ctx.params;
  const dish = await (await getContainer()).dishes.getById(id);
  if (!dish) throw new HttpError(404, "No se encontró el plato.");
  return json(dish);
});

export const PUT = route(async (request: Request, ctx: IdContext) => {
  await requireRole(request, "admin");
  const { id } = await ctx.params;
  const body = await parseBody(request, dishBodySchema);
  const { dishes } = await getContainer();
  return json(await saveDish({ dishes }, body, id));
});

export const DELETE = route(async (request: Request, ctx: IdContext) => {
  await requireRole(request, "admin");
  const { id } = await ctx.params;
  await (await getContainer()).dishes.remove(id);
  return new Response(null, { status: 204 });
});
