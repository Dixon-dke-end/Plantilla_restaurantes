export type Role = "customer" | "employee" | "admin";

export const ROLES: readonly Role[] = ["customer", "employee", "admin"];

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);

export type AuthUser = {
  id: string;
  email: string | null;
  fullName: string;
  role: Role;
};

export type TeamMember = AuthUser & { createdAt?: string };

export type NewTeamMember = {
  email: string;
  password: string;
  fullName: string;
  role: Exclude<Role, "customer">;
};
