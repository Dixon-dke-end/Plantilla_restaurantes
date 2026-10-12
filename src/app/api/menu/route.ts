import { getContainer } from "@/server/container";
import { json, route } from "@/server/http/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: categories and available dishes. */
export const GET = route(async () => {
  const { categories, dishes } = await getContainer();
  const [cats, items] = await Promise.all([categories.list(), dishes.list()]);
  return json({ categories: cats, dishes: items });
});
