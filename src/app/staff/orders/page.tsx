import type { Metadata } from "next";
import { OrderHistory } from "@/modules/orders/ui/OrderHistory";

export const metadata: Metadata = { title: "Historial de órdenes" };

export default function OrdersPage() {
  return <OrderHistory />;
}
