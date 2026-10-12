import { describe, expect, it } from "vitest";
import { signInErrorMessage } from "./authErrors";

describe("signInErrorMessage", () => {
  it("maps invalid credentials to a single generic Spanish message", () => {
    const generic = "Correo o contraseña incorrectos.";
    expect(signInErrorMessage({ status: 401, code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" })).toBe(generic);
    expect(signInErrorMessage({ status: 401, code: "USER_NOT_FOUND" })).toBe(generic);
    expect(signInErrorMessage({ status: 400, code: "INVALID_EMAIL" })).toBe(generic);
  });
  it("explains rate limiting", () => {
    expect(signInErrorMessage({ status: 429, message: "Too many requests" })).toMatch(/demasiados intentos/i);
  });
  it("never leaks English provider messages", () => {
    expect(signInErrorMessage({ status: 500, message: "Internal Server Error" })).toBe("No se pudo iniciar sesión. Inténtalo de nuevo.");
    expect(signInErrorMessage(null)).toBe("No se pudo iniciar sesión. Inténtalo de nuevo.");
    expect(signInErrorMessage(undefined)).toBe("No se pudo iniciar sesión. Inténtalo de nuevo.");
  });
});
