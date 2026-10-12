import { getContainer } from "@/server/container";
import { json, route } from "@/server/http/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => json(await (await getContainer()).categories.list()));
