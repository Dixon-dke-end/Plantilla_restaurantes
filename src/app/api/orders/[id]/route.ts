import { changeOrderStatus } from "@/modules/orders/application/changeOrderStatus";
import { getContainer } from "@/server/container";
import { requireRole } from "@/server/auth/session";
import { HttpError } from "@/server/http/errors";
import { json, parseBody, route, type IdContext } from "@/server/http/route";
import { orderStatusBodySchema } from "@/server/http/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public tracking page: only public fields (the random id is the capability). */
export const GET = route(async (_request: Request, ctx: IdContext) => {
  const { id } = await ctx.params;
  const order = await (await getContainer()).orders.getPublic(id);
  if (!order) throw new HttpError(404, "No se encontró el pedido.");
  return json(order);
});

/** Staff: move an order along the kitchen board. */
export const PATCH = route(async (request: Request, ctx: IdContext) => {
  await requireRole(request, "employee");
  const { id } = await ctx.params;
  const { status } = await parseBody(request, orderStatusBodySchema);
  const { orders } = await getContainer();
  const current = await orders.getPublic(id);
  if (!current) throw new HttpError(404, "No se encontró el pedido.");
  return json(await changeOrderStatus({ orders }, current, status));
});
