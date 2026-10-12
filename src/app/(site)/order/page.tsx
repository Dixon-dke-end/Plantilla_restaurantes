import type { Metadata } from "next";
import { LinkButton } from "@/shared/ui/Button";
import { PageTransition } from "@/shared/ui/PageTransition";
import { EmptyState } from "@/shared/ui/feedback";

export const metadata: Metadata = { title: "Estado del pedido" };

export default function OrderLandingPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title="No hay pedidos recientes"
          description="Cuando realices un pedido, podrás seguirlo aquí. El enlace de tu pedido también funciona en cualquier dispositivo."
          action={<LinkButton href="/menu">Ver el menú</LinkButton>}
        />
      </div>
    </PageTransition>
  );
}
