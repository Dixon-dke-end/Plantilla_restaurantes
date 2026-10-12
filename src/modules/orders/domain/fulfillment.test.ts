import { describe, expect, it } from "vitest";
import { displayTableLabel, fulfillmentToLabel, labelToFulfillment } from "./fulfillment";

describe("fulfillment labels", () => {
  it("formats dine-in and pickup labels in Spanish", () => {
    expect(fulfillmentToLabel({ type: "dine_in", table: " 12 " })).toBe("Mesa 12");
    expect(fulfillmentToLabel({ type: "pickup" })).toBe("Para llevar");
  });
  it("parses labels back into a fulfillment", () => {
    expect(labelToFulfillment("Mesa 12")).toEqual({ type: "dine_in", table: "12" });
    expect(labelToFulfillment("Para llevar")).toEqual({ type: "pickup" });
    expect(labelToFulfillment("  mesa  A3 ")).toEqual({ type: "dine_in", table: "A3" });
  });
  it("still understands labels stored before the Spanish translation", () => {
    expect(labelToFulfillment("Table 12")).toEqual({ type: "dine_in", table: "12" });
    expect(labelToFulfillment("Pickup")).toEqual({ type: "pickup" });
  });
  it("treats unknown labels as the table itself", () => {
    expect(labelToFulfillment("Patio 2")).toEqual({ type: "dine_in", table: "Patio 2" });
  });
  it("shows legacy English labels in Spanish", () => {
    expect(displayTableLabel("Table 7")).toBe("Mesa 7");
    expect(displayTableLabel("Pickup")).toBe("Para llevar");
    expect(displayTableLabel("Mesa 3")).toBe("Mesa 3");
    expect(displayTableLabel("Patio 2")).toBe("Patio 2");
  });
});
