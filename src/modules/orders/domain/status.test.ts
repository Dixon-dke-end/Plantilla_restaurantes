import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canCancel,
  canTransition,
  InvalidTransitionError,
  isActive,
  nextStatus,
  previousStatus,
  statusLabel,
} from "./status";
import { ORDER_STATUSES } from "./types";

describe("order status state machine", () => {
  it("advances pending -> preparing -> ready -> served", () => {
    expect(nextStatus("pending")).toBe("preparing");
    expect(nextStatus("preparing")).toBe("ready");
    expect(nextStatus("ready")).toBe("served");
  });

  it("has no next status for terminal states", () => {
    expect(nextStatus("served")).toBeNull();
    expect(nextStatus("cancelled")).toBeNull();
  });

  it("allows stepping back one column but not from pending, served or cancelled", () => {
    expect(previousStatus("preparing")).toBe("pending");
    expect(previousStatus("ready")).toBe("preparing");
    expect(previousStatus("pending")).toBeNull();
    expect(previousStatus("served")).toBeNull();
    expect(previousStatus("cancelled")).toBeNull();
  });

  it("allows cancelling only open orders", () => {
    expect(canCancel("pending")).toBe(true);
    expect(canCancel("preparing")).toBe(true);
    expect(canCancel("ready")).toBe(true);
    expect(canCancel("served")).toBe(false);
    expect(canCancel("cancelled")).toBe(false);
  });

  it("validates transitions", () => {
    expect(canTransition("pending", "preparing")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("ready", "preparing")).toBe(true);
    expect(canTransition("pending", "ready")).toBe(false);
    expect(canTransition("pending", "served")).toBe(false);
    expect(canTransition("served", "ready")).toBe(false);
    expect(canTransition("cancelled", "pending")).toBe(false);
    expect(canTransition("preparing", "preparing")).toBe(false);
  });

  it("has no transitions out of terminal states", () => {
    for (const to of ORDER_STATUSES) {
      expect(canTransition("served", to)).toBe(false);
      expect(canTransition("cancelled", to)).toBe(false);
    }
  });

  it("assertTransition throws a typed error for invalid moves", () => {
    expect(() => assertTransition("pending", "served")).toThrow(InvalidTransitionError);
    expect(() => assertTransition("pending", "preparing")).not.toThrow();
  });

  it("knows which statuses are active on the kitchen board", () => {
    expect(isActive("pending")).toBe(true);
    expect(isActive("preparing")).toBe(true);
    expect(isActive("ready")).toBe(true);
    expect(isActive("served")).toBe(false);
    expect(isActive("cancelled")).toBe(false);
  });

  it("provides customer-facing labels", () => {
    expect(statusLabel("pending")).toBe("Recibido");
    expect(statusLabel("preparing")).toBe("En preparación");
    expect(statusLabel("ready")).toBe("Listo");
    expect(statusLabel("served")).toBe("Servido");
    expect(statusLabel("cancelled")).toBe("Cancelado");
  });
});
