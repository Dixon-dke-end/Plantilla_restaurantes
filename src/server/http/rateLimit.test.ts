import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows up to the limit per key and then blocks with a retry hint", () => {
    const now = 0;
    const rl = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => now });
    expect(rl.check("ip1").allowed).toBe(true);
    expect(rl.check("ip1").allowed).toBe(true);
    expect(rl.check("ip1").allowed).toBe(true);
    const blocked = rl.check("ip1");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(rl.check("ip2").allowed).toBe(true);
  });

  it("resets after the window passes", () => {
    let now = 0;
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => now });
    expect(rl.check("k").allowed).toBe(true);
    expect(rl.check("k").allowed).toBe(false);
    now = 1001;
    expect(rl.check("k").allowed).toBe(true);
  });

  it("evicts stale keys so memory stays bounded", () => {
    let now = 0;
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => now, maxKeys: 2 });
    rl.check("a");
    rl.check("b");
    now = 5000;
    rl.check("c");
    expect(rl.size()).toBeLessThanOrEqual(2);
  });
});

describe("clientIp", () => {
  it("prefers the first x-forwarded-for hop, then x-real-ip", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientIp(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
