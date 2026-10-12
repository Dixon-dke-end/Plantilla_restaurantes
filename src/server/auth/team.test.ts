import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { createTestDb, resetTestDb } from "@/server/db/testing";
import type { DbHandle } from "@/server/db/client";
import { account } from "@/server/db/schema";
import { ConflictError, NotFoundError } from "@/shared/lib/appErrors";
import { createTeamMember, listTeam, removeTeamMember, setTeamRole } from "./team";

let handle: DbHandle;
beforeAll(async () => {
  handle = await createTestDb();
}, 60_000);
afterAll(async () => {
  await handle.close();
});
beforeEach(async () => {
  await resetTestDb(handle);
});

const admin = { email: "owner@x.test", password: "correct horse battery", fullName: "Owner", role: "admin" as const };
const cook = { email: "cook@x.test", password: "another long password", fullName: "Cook", role: "employee" as const };

describe("team service", () => {
  it("creates a user with a hashed credential account", async () => {
    const member = await createTeamMember(handle.db, admin);
    expect(member).toMatchObject({ email: "owner@x.test", fullName: "Owner", role: "admin" });
    const [acc] = await handle.db.select().from(account).where(eq(account.userId, member.id));
    expect(acc.providerId).toBe("credential");
    expect(acc.password).not.toBe(admin.password);
    expect(await verifyPassword({ hash: acc.password!, password: admin.password })).toBe(true);
  });

  it("normalizes emails and rejects duplicates", async () => {
    await createTeamMember(handle.db, admin);
    await expect(createTeamMember(handle.db, { ...cook, email: "OWNER@x.test" })).rejects.toThrow(ConflictError);
  });

  it("lists members oldest first", async () => {
    await createTeamMember(handle.db, admin);
    await createTeamMember(handle.db, cook);
    expect((await listTeam(handle.db)).map((m) => m.role)).toEqual(["admin", "employee"]);
  });

  it("changes roles but never demotes the last admin", async () => {
    const owner = await createTeamMember(handle.db, admin);
    const staff = await createTeamMember(handle.db, cook);
    await setTeamRole(handle.db, staff.id, "admin");
    await setTeamRole(handle.db, owner.id, "employee"); // another admin exists now
    await expect(setTeamRole(handle.db, staff.id, "employee")).rejects.toThrow(ConflictError);
    await expect(setTeamRole(handle.db, "missing", "admin")).rejects.toThrow(NotFoundError);
  });

  it("removes members but never the last admin", async () => {
    const owner = await createTeamMember(handle.db, admin);
    const staff = await createTeamMember(handle.db, cook);
    await expect(removeTeamMember(handle.db, owner.id)).rejects.toThrow(ConflictError);
    await removeTeamMember(handle.db, staff.id);
    expect(await listTeam(handle.db)).toHaveLength(1);
  });
});
