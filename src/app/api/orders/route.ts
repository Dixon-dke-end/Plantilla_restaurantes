import { placeOrder } from "@/modules/orders/application/placeOrder";
import { getContainer } from "@/server/container";
import { requireRole } from "@/server/auth/session";
import { HttpError } from "@/server/http/errors";
import { clientIp, createRateLimiter } from "@/server/http/rateLimit";
import { json, parseBody, parseQuery, route } from "@/server/http/route";
import { ordersQuerySchema, placeOrderBodySchema } from "@/server/http/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Globals = typeof globalThis & { __emberOrderLimiter?: ReturnType<typeof createRateLimiter> };
const limiter = () => {
  const g = globalThis as Globals;
  g.__emberOrderLimiter ??= createRateLimiter({ limit: 12, windowMs: 60_000 });
  return g.__emberOrderLimiter;
};

/** Staff: order history / board data. */
export const GET = route(async (request: Request) => {
  await requireRole(request, "employee");
  const filter = parseQuery(request, ordersQuerySchema);
  return json(await (await getContainer()).orders.list(filter));
});

/** Public: place an order. Prices are always computed from the database. */
export const POST = route(async (request: Request) => {
  const body = await parseBody(request, placeOrderBodySchema);

  let createdBy: string | null = null;
  if (body.source === "staff") {
    createdBy = (await requireRole(request, "employee")).id;
  } else {
    const result = limiter().check(clientIp(request.headers));
    if (!result.allowed) {
      throw new HttpError(429, "Demasiados pedidos desde esta conexión. Espera un momento e inténtalo de nuevo.");
    }
  }

  const { orders, dishes } = await getContainer();
  const placed = await placeOrder({ orders, dishes }, { ...body, createdBy });
  return json(placed, 201);
});
