"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { ErrorNote } from "@/shared/ui/feedback";
import { Field, Input } from "@/shared/ui/Field";
import { homePathFor } from "../domain/roles";
import { useAuth } from "./AuthProvider";

/** Email + password sign-in for staff. There is no sign-up: an admin creates accounts. */
export function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await signIn(email, password);
      const next = search.get("next");
      const target = next && next.startsWith("/") && !next.startsWith("//") ? next : homePathFor(user.role);
      router.replace(target);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Correo o contraseña incorrectos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Correo electrónico">
        {(p) => <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />}
      </Field>
      <Field label="Contraseña">
        {(p) => (
          <Input {...p} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        )}
      </Field>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      <Button type="submit" size="lg" className="w-full" disabled={busy || !email || !password}>
        {busy ? "Iniciando sesión..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}
