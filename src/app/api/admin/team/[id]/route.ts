import { getContainer } from "@/server/container";
import { requireRole } from "@/server/auth/session";
import { removeTeamMember, setTeamRole } from "@/server/auth/team";
import { HttpError } from "@/server/http/errors";
import { json, parseBody, route, type IdContext } from "@/server/http/route";
import { roleBodySchema } from "@/server/http/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = route(async (request: Request, ctx: IdContext) => {
  await requireRole(request, "admin");
  const { id } = await ctx.params;
  const { role } = await parseBody(request, roleBodySchema);
  await setTeamRole((await getContainer()).db, id, role);
  return json({ ok: true });
});

export const DELETE = route(async (request: Request, ctx: IdContext) => {
  const me = await requireRole(request, "admin");
  const { id } = await ctx.params;
  if (me.id === id) throw new HttpError(409, "No puedes eliminar tu propia cuenta.");
  await removeTeamMember((await getContainer()).db, id);
  return new Response(null, { status: 204 });
});
