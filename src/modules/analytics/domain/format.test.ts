import { describe, expect, it } from "vitest";
import { deltaTone, formatDelta, formatPercent } from "./format";

describe("formatDelta", () => {
  it("formats positive and negative changes with a proper minus sign", () => {
    expect(formatDelta(12.46)).toBe("+12.5%");
    expect(formatDelta(-8)).toBe("−8.0%");
  });
  it("formats zero without a sign", () => {
    expect(formatDelta(0)).toBe("0.0%");
  });
  it("shows an em dash when there is no baseline", () => {
    expect(formatDelta(null)).toBe("—");
  });
});

describe("deltaTone", () => {
  it("maps sign to tone", () => {
    expect(deltaTone(5)).toBe("up");
    expect(deltaTone(-5)).toBe("down");
    expect(deltaTone(0)).toBe("flat");
    expect(deltaTone(null)).toBe("flat");
  });
});

describe("formatPercent", () => {
  it("formats a ratio as a percentage", () => {
    expect(formatPercent(0.4567)).toBe("45.7%");
    expect(formatPercent(null)).toBe("—");
  });
});
