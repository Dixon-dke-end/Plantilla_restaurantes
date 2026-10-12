import { describe, expect, it } from "vitest";
import { formatOrderCode } from "./code";

describe("formatOrderCode", () => {
  it("pads the sequence to three digits", () => {
    expect(formatOrderCode(1)).toBe("A-001");
    expect(formatOrderCode(42)).toBe("A-042");
    expect(formatOrderCode(999)).toBe("A-999");
  });
  it("rolls over to the next letter every 999 orders", () => {
    expect(formatOrderCode(1000)).toBe("B-001");
    expect(formatOrderCode(1998)).toBe("B-999");
    expect(formatOrderCode(1999)).toBe("C-001");
  });
  it("wraps back to A after Z", () => {
    expect(formatOrderCode(26 * 999 + 1)).toBe("A-001");
  });
  it("rejects invalid sequences", () => {
    expect(() => formatOrderCode(0)).toThrow(RangeError);
    expect(() => formatOrderCode(1.5)).toThrow(RangeError);
  });
});
