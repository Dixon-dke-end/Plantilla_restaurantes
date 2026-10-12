/**
 * Typed domain errors. The HTTP layer maps them to 404 / 409 / 422, so classification never depends
 * on the (user-facing, translated) message text.
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** The request is valid but clashes with the current state (duplicates, last admin...). */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/** The request is well-formed but the content is not acceptable (empty order, unavailable dish, bad upload...). */
export class UnprocessableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnprocessableError";
  }
}
