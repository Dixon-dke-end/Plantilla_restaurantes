import { describe, expect, it, vi } from "vitest";
import { changeOrderStatus } from "./changeOrderStatus";
import { InvalidTransitionError } from "../domain/status";
import type { OrderRepository } from "../domain/ports";
import type { Order } from "../domain/types";

const order = (status: Order["status"]) => ({ id: "o1", status }) as Order;

function setup() {
  const updateStatus = vi.fn(async (id: string, status: Order["status"]) => ({ id, status }) as Order);
  return { deps: { orders: { updateStatus } as unknown as OrderRepository }, updateStatus };
}

describe("changeOrderStatus", () => {
  it("applies a valid transition through the repository", async () => {
    const { deps, updateStatus } = setup();
    const updated = await changeOrderStatus(deps, order("pending"), "preparing");
    expect(updateStatus).toHaveBeenCalledWith("o1", "preparing");
    expect(updated.status).toBe("preparing");
  });

  it("refuses invalid transitions without touching the repository", async () => {
    const { deps, updateStatus } = setup();
    await expect(changeOrderStatus(deps, order("pending"), "served")).rejects.toBeInstanceOf(InvalidTransitionError);
    await expect(changeOrderStatus(deps, order("served"), "cancelled")).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(updateStatus).not.toHaveBeenCalled();
  });
});
