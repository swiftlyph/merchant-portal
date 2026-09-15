import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReceiptPage } from "./receipt-page";
import * as ordersApi from "../api";
import { ApiError } from "@/lib/api/client";
import { makeReceipt } from "../test-fixtures";

vi.mock("../api", () => ({
  fetchReceipt: vi.fn(),
}));

function renderReceiptPage(id = "1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/app/orders/${id}/receipt`]}>
        <Routes>
          <Route path="/app/orders/:id/receipt" element={<ReceiptPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.print = vi.fn();
});

describe("ReceiptPage", () => {
  it("renders every section: header, order meta, lines, totals, payment, footer", async () => {
    vi.mocked(ordersApi.fetchReceipt).mockResolvedValue(makeReceipt());

    renderReceiptPage();

    expect(await screen.findByText("Merchant One")).toBeInTheDocument();
    expect(screen.getByText("Merchant One Food Corp.")).toBeInTheDocument();
    expect(screen.getByText("Thank you for visiting!")).toBeInTheDocument();
    expect(screen.getByText("ORD-000001")).toBeInTheDocument();
    expect(screen.getByText("Alice Cashier")).toBeInTheDocument();
    expect(screen.getByText(/Iced Latte/)).toBeInTheDocument();
    expect(screen.getByText("No refunds after 24 hours.")).toBeInTheDocument();
    // Subtotal/discount/total all present as formatted strings
    const totalRows = screen.getAllByText(formatted(15000));
    expect(totalRows.length).toBeGreaterThan(0);
  });

  it("renders the split payment breakdown", async () => {
    vi.mocked(ordersApi.fetchReceipt).mockResolvedValue(
      makeReceipt({
        order: {
          ...makeReceipt().order,
          payment_method: "split",
          cash_cents: 4000,
          cash_formatted: "₱40.00",
          gcash_cents: 6000,
          gcash_formatted: "₱60.00",
        },
      }),
    );

    renderReceiptPage();

    expect(await screen.findByText("Split")).toBeInTheDocument();
    expect(screen.getByText("₱40.00")).toBeInTheDocument();
    expect(screen.getByText("₱60.00")).toBeInTheDocument();
  });

  it("shows the VOIDED banner at both top and bottom for a voided order", async () => {
    vi.mocked(ordersApi.fetchReceipt).mockResolvedValue(
      makeReceipt({
        order: {
          ...makeReceipt().order,
          status: "voided",
          voided: true,
          voided_at: "2026-09-10T07:00:00.000Z",
        },
      }),
    );

    renderReceiptPage();

    const banners = await screen.findAllByText("VOIDED");
    expect(banners).toHaveLength(2);
  });

  it("does not show the VOIDED banner for a non-voided order", async () => {
    vi.mocked(ordersApi.fetchReceipt).mockResolvedValue(makeReceipt());

    renderReceiptPage();

    await screen.findByText("ORD-000001");
    expect(screen.queryByText("VOIDED")).not.toBeInTheDocument();
  });

  it("shows a clean not-found state on a 404", async () => {
    vi.mocked(ordersApi.fetchReceipt).mockRejectedValue(
      new ApiError({ status: 404, message: "Order not found.", code: "not_found" }),
    );

    renderReceiptPage("999");

    expect(await screen.findByText("Order not found")).toBeInTheDocument();
  });

  it("shows an error state with a retry-style back link on a non-404 failure", async () => {
    vi.mocked(ordersApi.fetchReceipt).mockRejectedValue(new Error("Network down"));

    renderReceiptPage();

    // useReceipt retries once on a non-404 error before isError settles
    // (same pattern as useOrder), so this needs a longer wait than the
    // default findByText timeout.
    expect(
      await screen.findByText("Couldn't load this receipt", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Network down")).toBeInTheDocument();
  });

  it("clicking Print receipt calls window.print", async () => {
    vi.mocked(ordersApi.fetchReceipt).mockResolvedValue(makeReceipt());

    renderReceiptPage();

    const button = await screen.findByRole("button", { name: "Print receipt" });
    button.click();

    expect(window.print).toHaveBeenCalledTimes(1);
  });
});

describe("ReceiptPage — F13/P10 tax & senior/PWD discount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
  });

  it("prints the VAT breakdown with real legal terms for a VAT-registered order", async () => {
    vi.mocked(ordersApi.fetchReceipt).mockResolvedValue(
      makeReceipt({
        order: {
          ...makeReceipt().order,
          tax: {
            vat_registered: true,
            vat_rate_bps: 1200,
            vatable_sales_cents: 12500,
            vatable_sales_formatted: "₱125.00",
            vat_cents: 1500,
            vat_formatted: "₱15.00",
            vat_exempt_sales_cents: 0,
            vat_exempt_sales_formatted: "₱0.00",
          },
        },
      }),
    );

    renderReceiptPage();

    expect(await screen.findByText("VATable sales")).toBeInTheDocument();
    expect(screen.getByText("₱125.00")).toBeInTheDocument();
    expect(screen.getByText("VAT (12%)")).toBeInTheDocument();
    expect(screen.getByText("VAT-exempt sales")).toBeInTheDocument();
    expect(screen.queryByText(/Non-VAT/)).not.toBeInTheDocument();
  });

  it("prints the Non-VAT note and no VAT lines for a non-VAT order", async () => {
    vi.mocked(ordersApi.fetchReceipt).mockResolvedValue(
      makeReceipt({
        order: {
          ...makeReceipt().order,
          tax: {
            vat_registered: false,
            non_vat_note: "This is a NON-VAT registered sale.",
            nonvat_sales_cents: 15000,
            nonvat_sales_formatted: "₱150.00",
          },
        },
      }),
    );

    renderReceiptPage();

    expect(await screen.findByText("This is a NON-VAT registered sale.")).toBeInTheDocument();
    expect(screen.queryByText("VATable sales")).not.toBeInTheDocument();
    expect(screen.queryByText(/^VAT \(/)).not.toBeInTheDocument();
  });

  it("prints each beneficiary's name, type, ID, and discount", async () => {
    vi.mocked(ordersApi.fetchReceipt).mockResolvedValue(
      makeReceipt({
        order: {
          ...makeReceipt().order,
          beneficiaries: [
            {
              type: "senior",
              type_label: "Senior Citizen",
              name: "Lola Remedios",
              id_number: "SC-2020-0001",
              discount_cents: 2800,
              discount_formatted: "₱28.00",
            },
          ],
        },
      }),
    );

    renderReceiptPage();

    expect(await screen.findByText("Senior/PWD discount")).toBeInTheDocument();
    expect(screen.getByText(/Lola Remedios/)).toBeInTheDocument();
    expect(screen.getByText(/Senior Citizen/)).toBeInTheDocument();
    expect(screen.getByText(/SC-2020-0001/)).toBeInTheDocument();
  });

  it("prints nothing extra for an ordinary receipt with no beneficiaries", async () => {
    vi.mocked(ordersApi.fetchReceipt).mockResolvedValue(makeReceipt());

    renderReceiptPage();

    await screen.findByText("ORD-000001");
    expect(screen.queryByText("Senior/PWD discount")).not.toBeInTheDocument();
  });

  it("prints a line's own statutory discount only when it has one", async () => {
    vi.mocked(ordersApi.fetchReceipt).mockResolvedValue(
      makeReceipt({
        order: {
          ...makeReceipt().order,
          lines: [
            {
              product_name: "Cafe Latte (16oz)",
              quantity: 1,
              unit_price_cents: 14000,
              unit_price_formatted: "₱140.00",
              line_total_cents: 14000,
              line_total_formatted: "₱140.00",
              discount_cents: 2800,
              discount_formatted: "₱28.00",
              payable_cents: 11200,
              payable_formatted: "₱112.00",
              add_ons: [],
            },
          ],
        },
      }),
    );

    renderReceiptPage();

    await screen.findByText(/Cafe Latte \(16oz\)/);
    expect(screen.getByText("-₱28.00")).toBeInTheDocument();
  });
});

function formatted(cents: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    currencyDisplay: "narrowSymbol",
  }).format(cents / 100);
}
