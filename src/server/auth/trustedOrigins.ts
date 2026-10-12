/**
 * Origins allowed to call the auth endpoints. Production trusts only BETTER_AUTH_URL. Development also
 * trusts localhost and any Cloudflare Quick Tunnel, whose random hostname changes on every run.
 */
const DEV_ORIGINS = ["http://localhost:*", "http://127.0.0.1:*", "https://*.trycloudflare.com"];

export function resolveTrustedOrigins({
  baseURL,
  nodeEnv,
}: {
  baseURL: string | undefined;
  nodeEnv: string | undefined;
}): string[] | undefined {
  const configured = baseURL ? [baseURL] : [];
  if (nodeEnv === "production") return configured.length > 0 ? configured : undefined;
  return [...configured, ...DEV_ORIGINS];
}
