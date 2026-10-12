// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketCard } from "./TicketCard";
import type { Order } from "../domain/types";

const NOW = new Date("2026-03-10T12:00:00Z").getTime();
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    code: "A-042",
    status: "pending",
    source: "customer",
    tableLabel: "Mesa 12",
    customerName: "Ana",
    notes: "Alergia a las nueces",
    totalCents: 4300,
    createdBy: null,
    createdAt: minutesAgo(2),
    updatedAt: minutesAgo(2),
    preparingAt: null,
    readyAt: null,
    servedAt: null,
    cancelledAt: null,
    items: [
      { dishId: "d1", dishName: "Ribeye", unitPriceCents: 3400, quantity: 1, notes: "medium rare" },
      { dishId: "d2", dishName: "Carrot Cake", unitPriceCents: 900, quantity: 2, notes: "" },
    ],
    ...overrides,
  };
}

const noop = () => {};

describe("TicketCard", () => {
  it("renders code, table, source, items, quantities and notes", () => {
    render(<TicketCard order={order()} now={NOW} onAdvance={noop} onBack={noop} onCancel={noop} />);
    expect(screen.getByText("A-042")).toBeInTheDocument();
    expect(screen.getByText("Mesa 12")).toBeInTheDocument();
    expect(screen.getByText("Cliente")).toBeInTheDocument();
    expect(screen.getByText("Ribeye")).toBeInTheDocument();
    expect(screen.getByText("medium rare")).toBeInTheDocument();
    expect(screen.getByText("Alergia a las nueces")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("marks staff-created tickets", () => {
    render(<TicketCard order={order({ source: "staff" })} now={NOW} onAdvance={noop} onBack={noop} onCancel={noop} />);
    expect(screen.getByText("Personal")).toBeInTheDocument();
  });

  it.each([
    [2, "fresh"],
    [10, "warning"],
    [20, "late"],
  ])("uses the %i-minute-old ticket's urgency '%s'", (minutes, urgency) => {
    const { container } = render(
      <TicketCard order={order({ createdAt: minutesAgo(minutes) })} now={NOW} onAdvance={noop} onBack={noop} onCancel={noop} />,
    );
    expect(container.querySelector("[data-urgency]")).toHaveAttribute("data-urgency", urgency);
  });

  it("shows the elapsed time", () => {
    render(<TicketCard order={order({ createdAt: minutesAgo(3) })} now={NOW} onAdvance={noop} onBack={noop} onCancel={noop} />);
    expect(screen.getByText("3:00")).toBeInTheDocument();
  });

  it("bumps the ticket from the large tap target", async () => {
    const onAdvance = vi.fn();
    render(<TicketCard order={order()} now={NOW} onAdvance={onAdvance} onBack={noop} onCancel={noop} />);
    await userEvent.click(screen.getByRole("button", { name: /iniciar preparación a-042/i }));
    expect(onAdvance).toHaveBeenCalledWith(expect.objectContaining({ id: "o1" }));
  });

  it("requires confirmation before cancelling", async () => {
    const onCancel = vi.fn();
    render(<TicketCard order={order()} now={NOW} onAdvance={noop} onBack={noop} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: /^cancelar$/i }));
    expect(onCancel).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /confirmar cancelación/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("hides the back action for the first column", () => {
    render(<TicketCard order={order({ status: "pending" })} now={NOW} onAdvance={noop} onBack={noop} onCancel={noop} />);
    expect(screen.queryByRole("button", { name: /^regresar$/i })).not.toBeInTheDocument();
  });

  it("offers the back action for later columns", async () => {
    const onBack = vi.fn();
    render(<TicketCard order={order({ status: "preparing" })} now={NOW} onAdvance={noop} onBack={onBack} onCancel={noop} />);
    await userEvent.click(screen.getByRole("button", { name: /^regresar$/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
