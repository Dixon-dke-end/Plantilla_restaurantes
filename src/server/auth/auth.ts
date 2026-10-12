import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/server/db/client";
import { account, session, user, verification } from "@/server/db/schema";
import { resolveTrustedOrigins } from "./trustedOrigins";

type Auth = ReturnType<typeof createAuth>;
type Globals = typeof globalThis & { __emberAuth?: Promise<Auth> };

function createAuth(db: Awaited<ReturnType<typeof getDb>>) {
  const baseURL = process.env.BETTER_AUTH_URL || undefined;
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL,
    trustedOrigins: resolveTrustedOrigins({ baseURL, nodeEnv: process.env.NODE_ENV }),
    emailAndPassword: {
      enabled: true,
      // Customers order without accounts; staff accounts are created by an admin.
      disableSignUp: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "customer", input: false },
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    advanced: {
      // httpOnly + sameSite=lax are the defaults; Secure is switched on automatically for https base URLs.
      useSecureCookies: baseURL?.startsWith("https://") ?? false,
    },
  });
}

/** Process-wide Better Auth instance (cookie sessions stored in Postgres). */
export function getAuth(): Promise<Auth> {
  const g = globalThis as Globals;
  g.__emberAuth ??= getDb().then(createAuth);
  return g.__emberAuth;
}
