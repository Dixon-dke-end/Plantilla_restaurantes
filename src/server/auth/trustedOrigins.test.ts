import { describe, expect, it } from "vitest";
import { resolveTrustedOrigins } from "./trustedOrigins";

describe("resolveTrustedOrigins", () => {
  it("trusts only the configured base URL in production", () => {
    expect(resolveTrustedOrigins({ baseURL: "https://ember.example.com", nodeEnv: "production" })).toEqual([
      "https://ember.example.com",
    ]);
  });

  it("leaves the default (request origin) in production when no base URL is configured", () => {
    expect(resolveTrustedOrigins({ baseURL: undefined, nodeEnv: "production" })).toBeUndefined();
  });

  it("trusts localhost and any Quick Tunnel in development, whatever the base URL", () => {
    const origins = resolveTrustedOrigins({
      baseURL: "https://old-tunnel.trycloudflare.com",
      nodeEnv: "development",
    });
    expect(origins).toEqual([
      "https://old-tunnel.trycloudflare.com",
      "http://localhost:*",
      "http://127.0.0.1:*",
      "https://*.trycloudflare.com",
    ]);
  });

  it("does not trust tunnels in production", () => {
    const origins = resolveTrustedOrigins({ baseURL: "https://ember.example.com", nodeEnv: "production" });
    expect(origins).not.toContain("https://*.trycloudflare.com");
  });
});
