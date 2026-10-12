import { getContainer } from "@/server/container";
import { requireRole } from "@/server/auth/session";
import { json, parseQuery, route } from "@/server/http/route";
import { eventsQuerySchema } from "@/server/http/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: dish view / AR launch events for the analytics dashboard. */
export const GET = route(async (request: Request) => {
  await requireRole(request, "admin");
  const { since } = parseQuery(request, eventsQuerySchema);
  const from = since ?? new Date(Date.now() - 62 * 24 * 60 * 60 * 1000);
  return json(await (await getContainer()).analytics.listDishEvents(from));
});
