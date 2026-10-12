import type { Metadata } from "next";
import { DishEditor } from "@/modules/menu/ui/DishEditor";

export const metadata: Metadata = { title: "Editar plato" };

export default async function EditDishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DishEditor dishId={id} />;
}
