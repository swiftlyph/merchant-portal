import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShiftReportPage } from "./shift-report-page";
import * as cashSessionsApi from "../api";
import { ApiError } from "@/lib/api/client";
import { makeZReport } from "../test-fixtures";

vi.mock("../api", () => ({
  fetchZReport: vi.fn(),
}));

function renderReportPage(id = "1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/app/cash-drawer/sessions/${id}/report`]}>
        <Routes>
          <Route path="/app/cash-drawer/sessions/:id/report" element={<ShiftReportPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.print = vi.fn();
});

describe("ShiftReportPage", () => {
  it("renders the reconciliation block in the same label order as the panel", async () => {
    vi.mocked(cashSessionsApi.fetchZReport).mockResolvedValue(
      makeZReport({ session: { ...makeZReport().session, status: "closed", closed_at: "2026-09-10T10:00:00.000Z" }, cash: { ...makeZReport().cash, counted_cash_cents: 99500, counted_cash_formatted: "₱995.00", variance_cents: 500, variance_formatted: "₱5.00" } }),
    );

    renderReportPage();

    for (const label of [
      "Cash sales",
      "Voided cash",
      "Cash in",
      "Cash out",
      "Cash sent out (confirmed)",
      "Expected cash",
      "Counted cash",
    ]) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
    // "Starting cash" appears twice by design — once in the sales summary,
    // once in the cash count block, matching the panel's own row.
    expect(await screen.findAllByText("Starting cash")).toHaveLength(2);
  });

  it("shows the PRELIMINARY mark for an open session and no counted/variance", async () => {
    vi.mocked(cashSessionsApi.fetchZReport).mockResolvedValue(makeZReport());

    renderReportPage();

    expect(await screen.findAllByText(/PRELIMINARY/)).toHaveLength(2);
    expect(screen.getByText("Session still open — not yet counted.")).toBeInTheDocument();
    expect(screen.queryByText("Counted cash")).not.toBeInTheDocument();
  });

  it("does not show the PRELIMINARY mark for a closed session", async () => {
    vi.mocked(cashSessionsApi.fetchZReport).mockResolvedValue(
      makeZReport({
        session: { ...makeZReport().session, status: "closed", closed_at: "2026-09-10T10:00:00.000Z" },
        cash: {
          ...makeZReport().cash,
          counted_cash_cents: 99500,
          counted_cash_formatted: "₱995.00",
          variance_cents: 500,
          variance_formatted: "₱5.00",
        },
      }),
    );

    renderReportPage();

    await screen.findByText("Counted cash");
    expect(screen.queryByText(/PRELIMINARY/)).not.toBeInTheDocument();
  });

  it("explains the shift report covers this session, not calendar dates", async () => {
    vi.mocked(cashSessionsApi.fetchZReport).mockResolvedValue(makeZReport());

    renderReportPage();

    expect(
      await screen.findByText(/covers only orders rung up during this drawer session/),
    ).toBeInTheDocument();
  });

  it("shows a clean not-found state on a 404", async () => {
    vi.mocked(cashSessionsApi.fetchZReport).mockRejectedValue(
      new ApiError({ status: 404, message: "Not found." }),
    );

    renderReportPage("999");

    expect(await screen.findByText("Session not found")).toBeInTheDocument();
  });

  it("clicking Print shift report calls window.print", async () => {
    vi.mocked(cashSessionsApi.fetchZReport).mockResolvedValue(makeZReport());

    renderReportPage();

    const button = await screen.findByRole("button", { name: "Print shift report" });
    button.click();

    expect(window.print).toHaveBeenCalledTimes(1);
  });
});

describe("ShiftReportPage — F13/P10 tax & senior/PWD discount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
  });

  it("shows the statutory/promo split under Discounts only when applicable", async () => {
    vi.mocked(cashSessionsApi.fetchZReport).mockResolvedValue(
      makeZReport({
        sales: {
          ...makeZReport().sales,
          discounts_cents: 3800,
          discounts_formatted: "₱38.00",
          statutory_discount_cents: 2800,
          statutory_discount_formatted: "₱28.00",
          promo_discount_cents: 1000,
          promo_discount_formatted: "₱10.00",
        },
      }),
    );

    renderReportPage();

    expect(await screen.findByText("Senior/PWD")).toBeInTheDocument();
    expect(screen.getByText("-₱28.00")).toBeInTheDocument();
    expect(await screen.findByText("Promo")).toBeInTheDocument();
    expect(screen.getByText("-₱10.00")).toBeInTheDocument();
  });

  it("omits the split when the shift has no statutory or promo discounts", async () => {
    vi.mocked(cashSessionsApi.fetchZReport).mockResolvedValue(
      makeZReport({
        sales: {
          ...makeZReport().sales,
          statutory_discount_cents: 0,
          promo_discount_cents: 0,
        },
      }),
    );

    renderReportPage();

    await screen.findByText("Sales summary");
    expect(screen.queryByText("Senior/PWD")).not.toBeInTheDocument();
    expect(screen.queryByText("Promo")).not.toBeInTheDocument();
  });

  it("shows a VAT summary row when the shift has VAT-registered sales", async () => {
    vi.mocked(cashSessionsApi.fetchZReport).mockResolvedValue(
      makeZReport({
        sales: {
          ...makeZReport().sales,
          vatable_sales_cents: 8929,
          vatable_sales_formatted: "₱89.29",
          vat_cents: 1071,
          vat_formatted: "₱10.71",
          vat_exempt_sales_cents: 0,
          vat_exempt_sales_formatted: "₱0.00",
        },
      }),
    );

    renderReportPage();

    expect(await screen.findByText("VAT summary")).toBeInTheDocument();
    expect(screen.getByText("VATable sales")).toBeInTheDocument();
    expect(screen.getByText("₱89.29")).toBeInTheDocument();
  });

  it("omits the VAT summary row entirely for a shift with no VAT-registered sales — never shows it zeroed out", async () => {
    vi.mocked(cashSessionsApi.fetchZReport).mockResolvedValue(
      makeZReport({
        sales: {
          ...makeZReport().sales,
          vatable_sales_cents: 0,
          vat_cents: 0,
          vat_exempt_sales_cents: 0,
          nonvat_sales_cents: 30000,
        },
      }),
    );

    renderReportPage();

    await screen.findByText("Sales summary");
    expect(screen.queryByText("VAT summary")).not.toBeInTheDocument();
    expect(screen.queryByText("VATable sales")).not.toBeInTheDocument();
  });
});
