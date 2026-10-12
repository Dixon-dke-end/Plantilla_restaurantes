"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button, LinkButton } from "@/shared/ui/Button";
import { Skeleton } from "@/shared/ui/feedback";
import { hasRole } from "../domain/roles";
import type { Role } from "../domain/types";
import { useAuth } from "./AuthProvider";

/**
 * Client container guarding staff/admin screens. The server enforces the same rules on every API
 * call (and proxy.ts requires a session cookie), so this only provides the right UX.
 */
export function RequireRole({ role, children }: { role: Exclude<Role, "customer">; children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6" aria-busy>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <AccessPanel title="Se requiere iniciar sesión" body="Esta área es para el equipo de Ember & Salt.">
        <LinkButton href={`/login?next=${encodeURIComponent(pathname)}`} size="lg">
          Iniciar sesión
        </LinkButton>
      </AccessPanel>
    );
  }

  if (!hasRole(user.role, role)) {
    return (
      <AccessPanel
        title="No tienes acceso"
        body={`Tu cuenta (${user.email ?? user.fullName}) no tiene permiso para abrir esta página.`}
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex min-h-11 items-center px-4 text-sm font-medium text-accent-strong underline-offset-4 hover:underline">
            Volver al sitio
          </Link>
          <Button variant="secondary" onClick={() => void signOut()}>
            Cambiar de cuenta
          </Button>
        </div>
      </AccessPanel>
    );
  }

  return <>{children}</>;
}

function AccessPanel({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="text-muted">{body}</p>
      {children}
    </div>
  );
}
