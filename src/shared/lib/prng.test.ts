import { describe, expect, it } from "vitest";
import { mulberry32, pickWeighted } from "./prng";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("produces values in [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("differs across seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe("pickWeighted", () => {
  it("never picks zero-weight entries", () => {
    const r = mulberry32(3);
    for (let i = 0; i < 100; i++) {
      expect(pickWeighted(["a", "b", "c"], [0, 1, 0], r)).toBe("b");
    }
  });
});
