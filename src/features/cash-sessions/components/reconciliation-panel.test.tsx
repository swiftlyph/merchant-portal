import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReconciliationPanel } from "./reconciliation-panel";
import { makeReconciliation } from "../test-fixtures";

describe("ReconciliationPanel", () => {
  it("labels the cash sales row and explains why it includes voided sales", () => {
    render(<ReconciliationPanel reconciliation={makeReconciliation({ cash_sales_cents: 50000, voided_cash_cents: 5000 })} />);

    expect(screen.getByText("Cash sales")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Includes voided sales, which are subtracted below. Reports show cash revenue with voids already removed.",
      ),
    ).toBeInTheDocument();
  });

  it("does not change the figure or the arithmetic — the row still shows cash_sales_cents as-is", () => {
    render(<ReconciliationPanel reconciliation={makeReconciliation({ cash_sales_cents: 50000 })} />);

    expect(screen.getByText("₱500.00")).toBeInTheDocument();
  });
});
