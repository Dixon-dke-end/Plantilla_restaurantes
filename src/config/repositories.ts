import { api } from "@/shared/lib/http";
import type { AnalyticsRepository } from "@/modules/analytics/domain/ports";
import { HttpAnalyticsRepository } from "@/modules/analytics/infrastructure/http/httpAnalyticsRepository";
import type { AuthGateway } from "@/modules/auth/domain/ports";
import { HttpAuthGateway } from "@/modules/auth/infrastructure/http/httpAuthGateway";
import type { CategoryRepository, DishRepository, MediaStorage } from "@/modules/menu/domain/ports";
import { HttpCategoryRepository, HttpDishRepository, HttpMediaStorage } from "@/modules/menu/infrastructure/http/httpMenu";
import type { OrderRepository } from "@/modules/orders/domain/ports";
import { HttpOrderRepository } from "@/modules/orders/infrastructure/http/httpOrderRepository";

export type Repositories = {
  dishes: DishRepository;
  categories: CategoryRepository;
  orders: OrderRepository;
  media: MediaStorage;
  analytics: AnalyticsRepository;
  auth: AuthGateway;
};

/**
 * Browser composition root. There is a single data path in every environment:
 * UI containers -> ports -> HTTP adapters -> Next.js route handlers -> Drizzle -> Postgres/PGlite.
 */
let instance: Repositories | null = null;

export function getRepositories(): Repositories {
  instance ??= {
    dishes: new HttpDishRepository(api),
    categories: new HttpCategoryRepository(api),
    orders: new HttpOrderRepository(api),
    media: new HttpMediaStorage(api),
    analytics: new HttpAnalyticsRepository(api),
    auth: new HttpAuthGateway(api),
  };
  return instance;
}
