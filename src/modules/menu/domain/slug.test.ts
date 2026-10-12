import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Carrot Cake")).toBe("carrot-cake");
  });
  it("strips diacritics and punctuation", () => {
    expect(slugify("  Crème Brûlée!! ")).toBe("creme-brulee");
  });
  it("replaces ampersands with 'y'", () => {
    expect(slugify("Mar & Tierra")).toBe("mar-y-tierra");
  });
  it("collapses repeated separators and trims hyphens", () => {
    expect(slugify("--A   --  B--")).toBe("a-b");
  });
  it("returns an empty string when nothing usable remains", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("returns the base when free", () => {
    expect(uniqueSlug("espresso", new Set(["latte"]))).toBe("espresso");
  });
  it("appends an incrementing suffix when taken", () => {
    expect(uniqueSlug("espresso", new Set(["espresso", "espresso-2"]))).toBe("espresso-3");
  });
});
