import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SalesByDayChart } from "./sales-by-day-chart";
import type { SalesByDayRow } from "../types";

const rows: SalesByDayRow[] = [
  { date: "2026-09-01", orders_count: 3, net_cents: 280000, net_formatted: "₱2,800.00" },
  { date: "2026-09-02", orders_count: 0, net_cents: 0, net_formatted: "₱0.00" },
];

describe("SalesByDayChart", () => {
  it("renders the chart (not raw cents) once data loads", () => {
    render(<SalesByDayChart rows={rows} isPending={false} isError={false} onRetry={() => {}} />);

    // The bare six-digit cents value must never appear as visible text.
    expect(screen.queryByText("280000")).not.toBeInTheDocument();
  });

  it("show table fallback renders the API's formatted strings", () => {
    render(<SalesByDayChart rows={rows} isPending={false} isError={false} onRetry={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Show table" }));

    expect(screen.getByText("₱2,800.00")).toBeInTheDocument();
    expect(screen.getByText("₱0.00")).toBeInTheDocument();
    expect(screen.queryByText("280000")).not.toBeInTheDocument();
  });
});
