import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/modules/auth/ui/LoginForm";
import { Card } from "@/shared/ui/Card";

export const metadata: Metadata = { title: "Acceso del personal" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <Link href="/" className="font-display text-3xl">
            Ember <span className="text-accent">&amp;</span> Salt
          </Link>
          <p className="text-muted">Acceso del personal</p>
        </div>
        <Card className="p-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </Card>
        <p className="text-center text-sm text-muted">
          Las cuentas las crea el propietario del restaurante.{" "}
          <Link href="/" className="text-accent-strong underline underline-offset-4">
            Volver al sitio
          </Link>
        </p>
      </div>
    </main>
  );
}
