import { createAuthClient } from "better-auth/client";
import type { ApiClient } from "@/shared/lib/http";
import type { AuthGateway, AuthListener } from "../../domain/ports";
import { signInErrorMessage } from "../../domain/authErrors";
import { isRole, type AuthUser, type NewTeamMember, type Role, type TeamMember } from "../../domain/types";

type SessionUser = { id: string; email?: string | null; name?: string | null; role?: unknown };

const toAuthUser = (user: SessionUser): AuthUser => ({
  id: user.id,
  email: user.email ?? null,
  fullName: user.name ?? user.email ?? "",
  role: isRole(user.role) ? user.role : "customer",
});

/** Browser-side AuthGateway: Better Auth cookie sessions + admin team endpoints. */
export class HttpAuthGateway implements AuthGateway {
  private readonly client = createAuthClient();
  private readonly listeners = new Set<AuthListener>();

  constructor(private readonly api: ApiClient) {}

  private emit(user: AuthUser | null) {
    for (const l of [...this.listeners]) l(user);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data } = await this.client.getSession();
    return data?.user ? toAuthUser(data.user as SessionUser) : null;
  }

  onChange(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async signInWithPassword(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.client.signIn.email({ email: email.trim(), password });
    if (error || !data?.user) throw new Error(signInErrorMessage(error));
    const user = (await this.getCurrentUser()) ?? toAuthUser(data.user as SessionUser);
    this.emit(user);
    return user;
  }

  async signOut(): Promise<void> {
    await this.client.signOut();
    this.emit(null);
  }

  listTeam(): Promise<TeamMember[]> {
    return this.api.get<TeamMember[]>("/api/admin/team");
  }

  createUser(input: NewTeamMember): Promise<TeamMember> {
    return this.api.post<TeamMember>("/api/admin/team", input);
  }

  async setRole(userId: string, role: Role): Promise<void> {
    await this.api.patch(`/api/admin/team/${encodeURIComponent(userId)}`, { role });
  }

  async removeUser(userId: string): Promise<void> {
    await this.api.del(`/api/admin/team/${encodeURIComponent(userId)}`);
  }
}
