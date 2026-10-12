import { ZodError } from "zod";
import { DishValidationError } from "@/modules/menu/application/menuUseCases";
import { OrderValidationError } from "@/modules/orders/application/placeOrder";
import { InvalidTransitionError } from "@/modules/orders/domain/status";
import { hasRole } from "@/modules/auth/domain/roles";
import type { Role } from "@/modules/auth/domain/types";
import { ConflictError, NotFoundError, UnprocessableError } from "@/shared/lib/appErrors";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Throws 401 without a session and 403 when the role is not enough. Admins pass employee checks. */
export function authorize(role: Role | null | undefined, required: Exclude<Role, "customer">): void {
  if (!role) throw new HttpError(401, "Debes iniciar sesión.");
  if (!hasRole(role, required)) throw new HttpError(403, "No tienes acceso a este recurso.");
}

export type ErrorResponse = { status: number; body: Record<string, unknown> };

export function toErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof HttpError) return { status: error.status, body: { error: error.message } };
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: "La solicitud no es válida.",
        issues: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      },
    };
  }
  if (error instanceof OrderValidationError) {
    return { status: 422, body: { error: error.message, issues: error.issues } };
  }
  if (error instanceof DishValidationError) {
    return { status: 422, body: { error: error.message, fieldErrors: error.errors } };
  }
  if (error instanceof InvalidTransitionError) return { status: 409, body: { error: error.message } };
  if (error instanceof NotFoundError) return { status: 404, body: { error: error.message } };
  if (error instanceof ConflictError) return { status: 409, body: { error: error.message } };
  if (error instanceof UnprocessableError) return { status: 422, body: { error: error.message } };
  return { status: 500, body: { error: "Algo salió mal de nuestro lado. Inténtalo de nuevo." } };
}
