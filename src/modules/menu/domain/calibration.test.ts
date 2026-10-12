import { describe, expect, it } from "vitest";
import { calibrateScale, scaledSizeCm } from "./calibration";

describe("calibrateScale", () => {
  it("returns scale 1 and 0% mismatch when the model is already real-size", () => {
    const r = calibrateScale({ x: 0.22, y: 0.1, z: 0.2 }, 22);
    expect(r.scale).toBeCloseTo(1, 6);
    expect(r.mismatchPct).toBeCloseTo(0, 6);
  });

  it("scales up a tiny model using the largest horizontal side as the diameter", () => {
    const r = calibrateScale({ x: 0.043, y: 0.063, z: 0.028 }, 7);
    expect(r.scale).toBeCloseTo(0.07 / 0.043, 6);
    expect(r.mismatchPct).toBeCloseTo((Math.abs(4.3 - 7) / 7) * 100, 4);
  });

  it("uses z when it is the larger horizontal side", () => {
    const r = calibrateScale({ x: 0.1, y: 0.05, z: 0.2 }, 10);
    expect(r.scale).toBeCloseTo(0.5, 6);
  });

  it("blends diameter and height factors (geometric mean) when height is given", () => {
    const r = calibrateScale({ x: 0.043, y: 0.063, z: 0.028 }, 7, 10);
    const sd = 0.07 / 0.043;
    const sh = 0.1 / 0.063;
    expect(r.scale).toBeCloseTo(Math.sqrt(sd * sh), 6);
    expect(r.mismatchPct).toBeCloseTo(Math.max((2.7 / 7) * 100, (3.7 / 10) * 100), 3);
  });

  it("reports an oversized model as a mismatch too", () => {
    const r = calibrateScale({ x: 2, y: 1, z: 2 }, 100);
    expect(r.scale).toBeCloseTo(0.5, 6);
    expect(r.mismatchPct).toBeCloseTo(100, 6);
  });

  it("rejects non-positive or non-finite input", () => {
    expect(() => calibrateScale({ x: 0, y: 0, z: 0 }, 10)).toThrow(RangeError);
    expect(() => calibrateScale({ x: 1, y: 1, z: 1 }, 0)).toThrow(RangeError);
    expect(() => calibrateScale({ x: 1, y: 1, z: 1 }, 10, -2)).toThrow(RangeError);
    expect(() => calibrateScale({ x: Infinity, y: 1, z: 1 }, 10)).toThrow(RangeError);
  });
});

describe("scaledSizeCm", () => {
  it("converts metres to centimetres and applies the scale", () => {
    expect(scaledSizeCm({ x: 0.1, y: 0.05, z: 0.2 }, 2)).toEqual({ x: 20, y: 10, z: 40 });
  });
});
