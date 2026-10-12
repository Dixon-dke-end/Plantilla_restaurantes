import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuContainer } from "@/modules/menu/ui/MenuContainer";
import { PageTransition } from "@/shared/ui/PageTransition";

export const metadata: Metadata = { title: "Menú" };

export default function MenuPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 max-w-2xl space-y-3">
          <h1 className="font-display text-5xl">El menú</h1>
          <p className="text-muted">
            Los platos marcados con AR se pueden colocar sobre tu mesa a su tamaño real. Abre un plato y toca &ldquo;Ver en tu mesa&rdquo;.
          </p>
        </header>
        <Suspense fallback={null}>
          <MenuContainer />
        </Suspense>
      </div>
    </PageTransition>
  );
}
