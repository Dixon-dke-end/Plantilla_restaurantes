import { getContainer } from "@/server/container";
import { requireRole } from "@/server/auth/session";
import { createTeamMember, listTeam } from "@/server/auth/team";
import { json, parseBody, route } from "@/server/http/route";
import { teamCreateBodySchema } from "@/server/http/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requireRole(request, "admin");
  return json(await listTeam((await getContainer()).db));
});

/** Admin: create an employee or admin account (public sign-up is disabled). */
export const POST = route(async (request: Request) => {
  await requireRole(request, "admin");
  const body = await parseBody(request, teamCreateBodySchema);
  return json(await createTeamMember((await getContainer()).db, body), 201);
});
