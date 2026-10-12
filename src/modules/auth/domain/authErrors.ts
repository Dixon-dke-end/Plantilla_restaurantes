/** Shape of the error object returned by the Better Auth client (only the fields we read). */
export type AuthClientError = { status?: number; code?: string; message?: string } | null | undefined;

const GENERIC_CREDENTIALS = new Set(["INVALID_EMAIL_OR_PASSWORD", "INVALID_PASSWORD", "INVALID_EMAIL", "USER_NOT_FOUND", "CREDENTIAL_ACCOUNT_NOT_FOUND"]);

/** Spanish, non-revealing message for a failed sign-in. Never forwards the provider's English text. */
export function signInErrorMessage(error: AuthClientError): string {
  if (error?.code && GENERIC_CREDENTIALS.has(error.code)) return "Correo o contraseña incorrectos.";
  if (error?.status === 429) return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  if (error?.status === 401) return "Correo o contraseña incorrectos.";
  return "No se pudo iniciar sesión. Inténtalo de nuevo.";
}
