import { getContainer } from "@/server/container";
import { clientIp, createRateLimiter } from "@/server/http/rateLimit";
import { json, parseBody, route } from "@/server/http/route";
import { dishEventBodySchema } from "@/server/http/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Globals = typeof globalThis & { __emberEventLimiter?: ReturnType<typeof createRateLimiter> };
const limiter = () => {
  const g = globalThis as Globals;
  g.__emberEventLimiter ??= createRateLimiter({ limit: 120, windowMs: 60_000 });
  return g.__emberEventLimiter;
};

/** Public: records a dish page view or an AR launch. Over-limit calls are dropped silently. */
export const POST = route(async (request: Request) => {
  const { dishId, kind } = await parseBody(request, dishEventBodySchema);
  if (limiter().check(clientIp(request.headers)).allowed) {
    await (await getContainer()).analytics.trackDishEvent(dishId, kind);
  }
  return json({ ok: true }, 202);
});
