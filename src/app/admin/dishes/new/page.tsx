import type { Metadata } from "next";
import { DishEditor } from "@/modules/menu/ui/DishEditor";

export const metadata: Metadata = { title: "Nuevo plato" };

export default function NewDishPage() {
  return <DishEditor />;
}
