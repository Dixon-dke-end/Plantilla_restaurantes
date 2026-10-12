import type { Metadata } from "next";
import { PosScreen } from "@/modules/orders/ui/PosScreen";

export const metadata: Metadata = { title: "Nueva orden" };

export default function NewOrderPage() {
  return <PosScreen />;
}
