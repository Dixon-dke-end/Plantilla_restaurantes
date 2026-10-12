"use client";

import { Trash2, UserPlus } from "lucide-react";
import { useCallback, useState } from "react";
import { useRepositories } from "@/config/useRepositories";
import { formatShortDate } from "@/shared/lib/dates";
import { useResource } from "@/shared/lib/useResource";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Dialog } from "@/shared/ui/Dialog";
import { ErrorNote, Skeleton } from "@/shared/ui/feedback";
import { Field, Input, Select } from "@/shared/ui/Field";
import { ROLE_LABELS } from "../domain/roles";
import { ROLES, type Role, type TeamMember } from "../domain/types";
import { useAuth } from "./AuthProvider";

/** Container for /admin/team: list accounts, change roles, add and remove staff (all enforced server-side). */
export function TeamAdmin() {
  const { auth } = useRepositories();
  const { user } = useAuth();
  const load = useCallback(() => auth.listTeam(), [auth]);
  const { data, error, reload } = useResource(load);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<TeamMember | null>(null);

  async function run(action: () => Promise<void>, success: string) {
    setActionError(null);
    setMessage(null);
    try {
      await action();
      setMessage(success);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo guardar el cambio.");
      reload();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Equipo</h1>
          <p className="text-sm text-muted">
            Los clientes piden sin cuenta. Las cuentas del personal se crean aquí; no hay registro público.
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <UserPlus size={16} aria-hidden /> Agregar integrante
        </Button>
      </div>

      {error ? <ErrorNote>No se pudo cargar el equipo: {error.message}</ErrorNote> : null}
      {actionError ? <ErrorNote>{actionError}</ErrorNote> : null}
      {message ? (
        <p role="status" className="rounded-[10px] bg-olive-soft px-4 py-3 text-sm text-olive">
          {message}
        </p>
      ) : null}
      {!data && !error ? <Skeleton className="h-60" /> : null}

      {data ? (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Correo</th>
                <th className="px-5 py-3 font-medium">Rol</th>
                <th className="px-5 py-3 font-medium">Desde</th>
                <th className="px-5 py-3 text-right font-medium">Eliminar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((member) => {
                const isMe = member.id === user?.id;
                return (
                  <tr key={member.id}>
                    <td className="px-5 py-3 font-medium">
                      {member.fullName} {isMe ? <Badge className="ml-1">Tú</Badge> : null}
                    </td>
                    <td className="px-5 py-3 text-muted">{member.email}</td>
                    <td className="px-5 py-3">
                      <Select
                        aria-label={`Rol de ${member.fullName}`}
                        value={member.role}
                        onChange={(e) => run(() => auth.setRole(member.id, e.target.value as Role), `${member.fullName} ahora es ${ROLE_LABELS[e.target.value as Role]}.`)}
                        className="w-40"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-5 py-3 text-muted">{member.createdAt ? formatShortDate(member.createdAt) : "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        disabled={isMe}
                        aria-label={`Eliminar a ${member.fullName}`}
                        onClick={() => setRemoving(member)}
                        className="grid size-11 place-items-center rounded-[10px] text-muted hover:bg-red-soft hover:text-red disabled:opacity-40"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : null}

      <AddMemberDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreate={async (input) => {
          await auth.createUser(input);
          setAdding(false);
          setMessage(`${input.fullName} fue agregado al equipo.`);
          reload();
        }}
      />

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="¿Eliminar esta cuenta?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Conservar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const target = removing;
                setRemoving(null);
                if (target) void run(() => auth.removeUser(target.id), `${target.fullName} fue eliminado.`);
              }}
            >
              Eliminar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">{removing?.fullName} ya no podrá iniciar sesión.</p>
      </Dialog>
    </div>
  );
}

function AddMemberDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { email: string; password: string; fullName: string; role: "employee" | "admin" }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"employee" | "admin">("employee");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreate({ email, password, fullName, role });
      setFullName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Agregar integrante">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre completo">{(p) => <Input {...p} value={fullName} onChange={(e) => setFullName(e.target.value)} required />}</Field>
        <Field label="Correo electrónico">{(p) => <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />}</Field>
        <Field label="Contraseña temporal" hint="Mínimo 10 caracteres. Compártela de forma segura.">
          {(p) => <Input {...p} type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} required autoComplete="new-password" />}
        </Field>
        <Field label="Rol">
          {(p) => (
            <Select {...p} value={role} onChange={(e) => setRole(e.target.value as "employee" | "admin")}>
              <option value="employee">Empleado (cocina y órdenes)</option>
              <option value="admin">Administrador (acceso total)</option>
            </Select>
          )}
        </Field>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Creando..." : "Crear cuenta"}
        </Button>
      </form>
    </Dialog>
  );
}
