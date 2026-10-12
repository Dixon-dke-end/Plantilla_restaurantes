import { describe, expect, it } from "vitest";
import { formatMoney, parsePriceToCents } from "./money";

describe("formatMoney", () => {
  it("formats cents as USD", () => {
    expect(formatMoney(1250)).toBe("$12.50");
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(123456)).toBe("$1,234.56");
  });
  it("keeps US dollars under the Spanish (US) locale", () => {
    expect(formatMoney(99)).toBe("$0.99");
  });
});

describe("parsePriceToCents", () => {
  it("parses plain and formatted numbers", () => {
    expect(parsePriceToCents("12.5")).toBe(1250);
    expect(parsePriceToCents("$1,234.56")).toBe(123456);
    expect(parsePriceToCents("9")).toBe(900);
  });
  it("rejects invalid or negative input", () => {
    expect(parsePriceToCents("")).toBeNull();
    expect(parsePriceToCents("abc")).toBeNull();
    expect(parsePriceToCents("-1")).toBeNull();
  });
});
