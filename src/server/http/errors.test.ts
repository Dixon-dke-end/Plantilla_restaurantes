import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";
import { authorize, HttpError, toErrorResponse } from "./errors";
import { OrderValidationError } from "@/modules/orders/application/placeOrder";
import { DishValidationError } from "@/modules/menu/application/menuUseCases";
import { InvalidTransitionError } from "@/modules/orders/domain/status";
import { ConflictError, NotFoundError, UnprocessableError } from "@/shared/lib/appErrors";

describe("authorize (server-side role check)", () => {
  it("returns 401 when there is no session", () => {
    try {
      authorize(null, "employee");
      expect.unreachable();
    } catch (e) {
      expect((e as HttpError).status).toBe(401);
    }
  });
  it("returns 403 for an insufficient role", () => {
    expect(() => authorize("customer", "employee")).toThrow(HttpError);
    try {
      authorize("employee", "admin");
      expect.unreachable();
    } catch (e) {
      expect((e as HttpError).status).toBe(403);
    }
  });
  it("lets employees pass employee checks and admins pass everything", () => {
    expect(() => authorize("employee", "employee")).not.toThrow();
    expect(() => authorize("admin", "employee")).not.toThrow();
    expect(() => authorize("admin", "admin")).not.toThrow();
  });
});

describe("toErrorResponse", () => {
  it("maps validation errors to 400/422 with details", () => {
    const zod = (() => {
      try {
        z.object({ a: z.string() }).parse({});
      } catch (e) {
        return e as ZodError;
      }
      throw new Error("unreachable");
    })();
    expect(toErrorResponse(zod).status).toBe(400);
    const order = toErrorResponse(new OrderValidationError([{ field: "items", message: "Tu pedido está vacío." }]));
    expect(order.status).toBe(422);
    expect(order.body).toMatchObject({ issues: [{ field: "items" }] });
    const dish = toErrorResponse(new DishValidationError({ name: "Name is required." }));
    expect(dish.status).toBe(422);
    expect(dish.body).toMatchObject({ fieldErrors: { name: "Name is required." } });
  });
  it("maps transitions to 409 and HttpError to its status", () => {
    expect(toErrorResponse(new InvalidTransitionError("pending", "served")).status).toBe(409);
    expect(toErrorResponse(new HttpError(404, "Not found")).status).toBe(404);
  });
  it("maps typed domain errors to 404 / 409 / 422 regardless of the message language", () => {
    expect(toErrorResponse(new NotFoundError("No se encontró el pedido.")).status).toBe(404);
    expect(toErrorResponse(new ConflictError("Ya existe.")).status).toBe(409);
    const rejected = toErrorResponse(new UnprocessableError("El archivo está vacío."));
    expect(rejected.status).toBe(422);
    expect(rejected.body).toEqual({ error: "El archivo está vacío." });
  });
  it("does not classify untyped errors by their message", () => {
    expect(toErrorResponse(new Error("Order not found.")).status).toBe(500);
  });
  it("returns Spanish messages for auth failures", () => {
    expect(toErrorResponse(new HttpError(401, "x")).body).toEqual({ error: "x" });
    expect(() => authorize(null, "employee")).toThrow(/iniciar sesión/i);
    expect(() => authorize("customer", "employee")).toThrow(/no tienes acceso/i);
  });
  it("does not leak unexpected error details", () => {
    const r = toErrorResponse(new Error("password authentication failed for user postgres"));
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toMatch(/postgres/);
    expect((r.body as { error: string }).error).toMatch(/algo salió mal/i);
  });
});
