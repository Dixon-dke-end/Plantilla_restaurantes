import type { Role } from "./types";

const RANK: Record<Role, number> = { customer: 0, employee: 1, admin: 2 };

/** Admins can do everything employees can; customers and anonymous users have no staff access. */
export function hasRole(role: Role | null | undefined, required: Exclude<Role, "customer">): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[required];
}

export const isStaffRole = (role: Role | null | undefined): boolean => hasRole(role, "employee");

export function homePathFor(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "employee") return "/staff/kitchen";
  return "/";
}

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Cliente",
  employee: "Empleado",
  admin: "Administrador",
};
