import { asc, count, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { ConflictError, NotFoundError } from "@/shared/lib/appErrors";
import { newId } from "@/shared/lib/id";
import { isRole, type NewTeamMember, type Role, type TeamMember } from "@/modules/auth/domain/types";
import type { Db } from "@/server/db/client";
import { account, user } from "@/server/db/schema";

type UserRow = typeof user.$inferSelect;

const toMember = (row: UserRow): TeamMember => ({
  id: row.id,
  email: row.email,
  fullName: row.name,
  role: isRole(row.role) ? row.role : "customer",
  createdAt: row.createdAt.toISOString(),
});

const isUniqueViolation = (e: unknown) => {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "23505" || err?.cause?.code === "23505";
};

export async function listTeam(db: Db): Promise<TeamMember[]> {
  const rows = await db.select().from(user).orderBy(asc(user.createdAt), asc(user.email));
  return rows.map(toMember);
}

/** Creates a credential account directly (public sign-up is disabled, so this is the only way in). */
export async function createTeamMember(db: Db, input: NewTeamMember): Promise<TeamMember> {
  const email = input.email.trim().toLowerCase();
  const id = newId();
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(user)
        .values({ id, name: input.fullName.trim(), email, emailVerified: true, role: input.role })
        .returning();
      await tx.insert(account).values({
        id: newId(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: passwordHash,
      });
      return toMember(row);
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new ConflictError("Ya existe una cuenta con este correo.");
    throw e;
  }
}

async function adminCount(db: Db): Promise<number> {
  const [row] = await db.select({ n: count() }).from(user).where(eq(user.role, "admin"));
  return row.n;
}

export async function setTeamRole(db: Db, userId: string, role: Role): Promise<void> {
  const [target] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!target) throw new NotFoundError("No se encontró al usuario.");
  if (target.role === "admin" && role !== "admin" && (await adminCount(db)) <= 1) {
    throw new ConflictError("No puedes quitar el rol al último administrador.");
  }
  await db.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, userId));
}

export async function removeTeamMember(db: Db, userId: string): Promise<void> {
  const [target] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!target) throw new NotFoundError("No se encontró al usuario.");
  if (target.role === "admin" && (await adminCount(db)) <= 1) {
    throw new ConflictError("No puedes eliminar al último administrador.");
  }
  await db.delete(user).where(eq(user.id, userId));
}
