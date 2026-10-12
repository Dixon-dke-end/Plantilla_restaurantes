import type { Metadata } from "next";
import { DishesAdmin } from "@/modules/menu/ui/DishesAdmin";

export const metadata: Metadata = { title: "Platos" };

export default function AdminDishesPage() {
  return <DishesAdmin />;
}
