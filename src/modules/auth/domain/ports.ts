import type { AuthUser, NewTeamMember, Role, TeamMember } from "./types";

export type AuthListener = (user: AuthUser | null) => void;

export interface AuthGateway {
  getCurrentUser(): Promise<AuthUser | null>;
  onChange(listener: AuthListener): () => void;
  signInWithPassword(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  /** Admin only. */
  listTeam(): Promise<TeamMember[]>;
  /** Admin only. Public sign-up is disabled; staff accounts are created here. */
  createUser(input: NewTeamMember): Promise<TeamMember>;
  /** Admin only. */
  setRole(userId: string, role: Role): Promise<void>;
  /** Admin only. */
  removeUser(userId: string): Promise<void>;
}
