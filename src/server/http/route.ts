import type { ZodType } from "zod";
import { HttpError, toErrorResponse } from "./errors";

export type Handler<C = unknown> = (request: Request, context: C) => Promise<Response>;

/** Wraps a route handler so every error becomes a safe JSON response. */
export function route<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      if (status >= 500) console.error("[api]", request.method, new URL(request.url).pathname, error);
      return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
    }
  };
}

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, "El cuerpo de la solicitud debe ser JSON válido.");
  }
  return schema.parse(raw);
}

export function parseQuery<T>(request: Request, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(new URL(request.url).searchParams));
}

export type IdContext = { params: Promise<{ id: string }> };
