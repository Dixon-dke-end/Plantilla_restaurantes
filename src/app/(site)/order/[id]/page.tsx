import type { Metadata } from "next";
import { OrderTracker } from "@/modules/orders/ui/OrderTracker";
import { PageTransition } from "@/shared/ui/PageTransition";

export const metadata: Metadata = { title: "Tu pedido" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-6 font-display text-4xl">Estado del pedido</h1>
        <OrderTracker id={id} />
      </div>
    </PageTransition>
  );
}
