import { isRole, type AuthUser, type Role } from "@/modules/auth/domain/types";
import { authorize } from "@/server/http/errors";
import { getAuth } from "./auth";

/** Resolves the signed-in user from the session cookie, or null. */
export async function getSessionUser(headers: Headers): Promise<AuthUser | null> {
  const auth = await getAuth();
  const result = await auth.api.getSession({ headers });
  if (!result) return null;
  const role = (result.user as { role?: unknown }).role;
  return {
    id: result.user.id,
    email: result.user.email,
    fullName: result.user.name,
    role: isRole(role) ? role : "customer",
  };
}

/** Server-side role gate used by every staff/admin endpoint. Throws HttpError 401/403. */
export async function requireRole(request: Request, required: Exclude<Role, "customer">): Promise<AuthUser> {
  const current = await getSessionUser(request.headers);
  authorize(current?.role, required);
  return current as AuthUser;
}
