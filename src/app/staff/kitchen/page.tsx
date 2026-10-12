import type { Metadata } from "next";
import { KitchenBoard } from "@/modules/orders/ui/KitchenBoard";

export const metadata: Metadata = { title: "Cocina" };

export default function KitchenPage() {
  return <KitchenBoard />;
}
