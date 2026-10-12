import { describe, expect, it } from "vitest";
import { hasRole, homePathFor, ROLE_LABELS } from "./roles";

describe("hasRole", () => {
  it("lets admins access employee and admin areas", () => {
    expect(hasRole("admin", "admin")).toBe(true);
    expect(hasRole("admin", "employee")).toBe(true);
  });
  it("lets employees access only the employee area", () => {
    expect(hasRole("employee", "employee")).toBe(true);
    expect(hasRole("employee", "admin")).toBe(false);
  });
  it("denies customers and anonymous users", () => {
    expect(hasRole("customer", "employee")).toBe(false);
    expect(hasRole(null, "employee")).toBe(false);
    expect(hasRole(undefined, "admin")).toBe(false);
  });
});

describe("ROLE_LABELS", () => {
  it("are shown in Spanish", () => {
    expect(ROLE_LABELS).toEqual({ customer: "Cliente", employee: "Empleado", admin: "Administrador" });
  });
});

describe("homePathFor", () => {
  it("routes each role to its landing page", () => {
    expect(homePathFor("admin")).toBe("/admin");
    expect(homePathFor("employee")).toBe("/staff/kitchen");
    expect(homePathFor("customer")).toBe("/");
  });
});
