import { saveDish } from "@/modules/menu/application/menuUseCases";
import { getContainer } from "@/server/container";
import { requireRole } from "@/server/auth/session";
import { json, parseBody, route } from "@/server/http/route";
import { dishBodySchema } from "@/server/http/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requireRole(request, "admin");
  return json(await (await getContainer()).dishes.list({ includeUnavailable: true }));
});

export const POST = route(async (request: Request) => {
  await requireRole(request, "admin");
  const body = await parseBody(request, dishBodySchema);
  const { dishes } = await getContainer();
  return json(await saveDish({ dishes }, body), 201);
});
