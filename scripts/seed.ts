import { getDbHandle } from "../src/server/db/client";
import { seedDatabase } from "../src/server/seed/seed";
import type { NewTeamMember } from "../src/modules/auth/domain/types";

function staffFromEnv(): NewTeamMember[] {
  const staff: NewTeamMember[] = [];
  const add = (prefix: string, role: NewTeamMember["role"], fullName: string) => {
    const email = process.env[`${prefix}_EMAIL`]?.trim();
    const password = process.env[`${prefix}_PASSWORD`];
    if (!email || !password) return;
    if (password.length < 10) throw new Error(`${prefix}_PASSWORD must be at least 10 characters.`);
    staff.push({ email, password, fullName, role });
  };
  add("SEED_ADMIN", "admin", "Owner");
  add("SEED_EMPLOYEE", "employee", "Kitchen Staff");
  return staff;
}

function wantsDemoData(): boolean {
  const flag = process.env.SEED_DEMO_DATA?.trim().toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

async function main() {
  const handle = await getDbHandle();
  await handle.migrate();
  const staff = staffFromEnv();
  const includeDemoData = wantsDemoData();
  await seedDatabase(handle.db, { staff, includeDemoData });
  console.log(
    `Seed complete (${handle.driver}): catalog ready, ${staff.length} staff account(s) ensured, demo history ${
      includeDemoData ? "enabled" : "skipped"
    }.`,
  );
  if (staff.length === 0) {
    console.log("No SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD set: no staff accounts were created.");
  }
  await handle.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
