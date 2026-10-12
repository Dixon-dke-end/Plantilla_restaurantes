// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCard } from "./KpiCard";

describe("KpiCard", () => {
  it("shows label, value and a positive delta", () => {
    render(<KpiCard label="Revenue" value="$5,000.00" deltaPct={12.46} />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("$5,000.00")).toBeInTheDocument();
    const delta = screen.getByText("+12.5%");
    expect(delta).toHaveAttribute("data-tone", "up");
  });

  it("formats a negative delta with a minus sign and down tone", () => {
    render(<KpiCard label="Orders" value="40" deltaPct={-8} />);
    const delta = screen.getByText("−8.0%");
    expect(delta).toHaveAttribute("data-tone", "down");
  });

  it("shows an em dash when there is no previous period to compare", () => {
    render(<KpiCard label="Orders" value="0" deltaPct={null} />);
    const delta = screen.getByText("—");
    expect(delta).toHaveAttribute("data-tone", "flat");
  });
});
