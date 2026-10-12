import { describe, expect, it } from "vitest";
import { buildSizeGuide, CARD_CM, PLATE_CM } from "./sizeGuide";

describe("buildSizeGuide", () => {
  it("scales everything relative to the largest object", () => {
    const g = buildSizeGuide(30);
    expect(g.maxCm).toBe(30);
    const dish = g.items.find((i) => i.key === "dish")!;
    const plate = g.items.find((i) => i.key === "plate")!;
    expect(dish.ratio).toBe(1);
    expect(plate.ratio).toBeCloseTo(PLATE_CM / 30, 6);
  });
  it("keeps the plate as the reference when the dish is small", () => {
    const g = buildSizeGuide(10);
    expect(g.maxCm).toBe(PLATE_CM);
    expect(g.items.find((i) => i.key === "dish")!.ratio).toBeCloseTo(10 / PLATE_CM, 6);
  });
  it("includes a credit card with real proportions", () => {
    const card = buildSizeGuide(20).items.find((i) => i.key === "card")!;
    expect(card.widthCm).toBe(CARD_CM.width);
    expect(card.heightCm).toBe(CARD_CM.height);
  });
});
