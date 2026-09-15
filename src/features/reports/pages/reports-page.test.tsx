import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReportsPage } from "./reports-page";
import * as reportsApi from "../api";
import { ApiError } from "@/lib/api/client";
import {
  makeSalesByDayResponse,
  makeSalesByDayRow,
  makeSalesSummary,
  makeTopItemsResponse,
} from "../test-fixtures";

vi.mock("../api", () => ({
  fetchSalesSummary: vi.fn(),
  fetchSalesByDay: vi.fn(),
  fetchTopItems: vi.fn(),
}));

function renderPage(initialEntry = "/app/reports") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ReportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.fetchSalesSummary).mockResolvedValue(makeSalesSummary());
    vi.mocked(reportsApi.fetchSalesByDay).mockResolvedValue(makeSalesByDayResponse());
    vi.mocked(reportsApi.fetchTopItems).mockResolvedValue(makeTopItemsResponse());
  });

  it("renders the summary figures from the API's formatted strings", async () => {
    renderPage();

    expect(await screen.findByText(makeSalesSummary().net_formatted)).toBeInTheDocument();
    expect(screen.getByText(makeSalesSummary().gross_formatted)).toBeInTheDocument();
  });

  it("renders the accounting-rules note as visible page copy", async () => {
    renderPage();
    expect(
      await screen.findByText(/Pending orders count as revenue/i),
    ).toBeInTheDocument();
  });

  it("renders top-items rows", async () => {
    renderPage();
    expect(await screen.findByText("Cafe Latte (16oz)")).toBeInTheDocument();
  });

  it("shows an empty state distinct from an error when a range has no sales", async () => {
    vi.mocked(reportsApi.fetchSalesByDay).mockResolvedValue(makeSalesByDayResponse({ data: [] }));
    vi.mocked(reportsApi.fetchTopItems).mockResolvedValue(makeTopItemsResponse({ data: [] }));

    renderPage();

    expect(await screen.findByText("No sales in this range.")).toBeInTheDocument();
    expect(screen.getByText("No items sold in this range.")).toBeInTheDocument();
    expect(screen.queryByText(/Couldn't load/)).not.toBeInTheDocument();
  });

  it("zero-sale days still render in the sales-by-day data — never dropped as gaps", async () => {
    vi.mocked(reportsApi.fetchSalesByDay).mockResolvedValue(
      makeSalesByDayResponse({
        data: [
          makeSalesByDayRow({ date: "2026-09-01", orders_count: 1, net_cents: 5000 }),
          makeSalesByDayRow({ date: "2026-09-02", orders_count: 0, net_cents: 0, net_formatted: "₱0.00" }),
          makeSalesByDayRow({ date: "2026-09-03", orders_count: 1, net_cents: 3000 }),
        ],
      }),
    );

    renderPage("/app/reports?from=2026-09-01&to=2026-09-03");

    // Toggle to the accessible table to assert on the zero-sale row directly.
    // fireEvent (not a raw .click()) so the resulting state update is flushed
    // before the chart's SVG unmounts — avoids a flaky window where the
    // outgoing chart's own "₱0.00" axis tick and the incoming table cell
    // briefly overlap.
    const toggle = await screen.findByText("Show table");
    fireEvent.click(toggle);

    expect(await screen.findByText("₱0.00")).toBeInTheDocument();
  });

  it("a per-section 422 range_too_large error is shown without blanking the whole page", async () => {
    vi.mocked(reportsApi.fetchSalesSummary).mockRejectedValue(
      new ApiError({
        status: 422,
        message: "The report range spans 517 days; the maximum is 366.",
        code: "range_too_large",
      }),
    );

    renderPage();

    // Both summary-fed sections (SummaryCards and PaymentMethodBreakdown)
    // share the one sales-summary query, so both surface the same error —
    // expected, matching the dashboard's own kitchen-summary pattern.
    expect(
      await screen.findAllByText("The report range spans 517 days; the maximum is 366."),
    ).toHaveLength(2);
    // Top items still render — one section's error doesn't blank the page.
    expect(await screen.findByText("Cafe Latte (16oz)")).toBeInTheDocument();
  });

  it("blocks an obviously-too-large custom range client-side via the URL", async () => {
    renderPage("/app/reports?from=2025-01-01&to=2026-06-01");

    expect(
      await screen.findByText("That range is too large to report on. Choose a narrower range above."),
    ).toBeInTheDocument();
    // No report requests are made for a range already known to be too large.
    await waitFor(() => expect(reportsApi.fetchSalesSummary).not.toHaveBeenCalled());
  });

  it("changing the range refetches all three sections together", async () => {
    renderPage();
    await screen.findByText(makeSalesSummary().net_formatted);

    vi.mocked(reportsApi.fetchSalesSummary).mockClear();
    vi.mocked(reportsApi.fetchSalesByDay).mockClear();
    vi.mocked(reportsApi.fetchTopItems).mockClear();

    const select = screen.getByRole("combobox");
    select.click();
    const option = await screen.findByText("Last 7 days");
    option.click();

    await waitFor(() => {
      expect(reportsApi.fetchSalesSummary).toHaveBeenCalledTimes(1);
      expect(reportsApi.fetchSalesByDay).toHaveBeenCalledTimes(1);
      expect(reportsApi.fetchTopItems).toHaveBeenCalledTimes(1);
    });

    const [summaryRange] = vi.mocked(reportsApi.fetchSalesSummary).mock.calls[0]!;
    const [byDayRange] = vi.mocked(reportsApi.fetchSalesByDay).mock.calls[0]!;
    const [topItemsRange] = vi.mocked(reportsApi.fetchTopItems).mock.calls[0]!;
    expect(summaryRange).toEqual(byDayRange);
    expect(topItemsRange).toMatchObject(byDayRange as object);
  });
});

describe("ReportsPage — F13/P10 tax & senior/PWD discount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.fetchSalesByDay).mockResolvedValue(makeSalesByDayResponse());
    vi.mocked(reportsApi.fetchTopItems).mockResolvedValue(makeTopItemsResponse());
  });

  it("shows statutory and promo discount tiles only when each individually applies", async () => {
    vi.mocked(reportsApi.fetchSalesSummary).mockResolvedValue(
      makeSalesSummary({ statutory_discount_cents: 2800, statutory_discount_formatted: "₱28.00", promo_discount_cents: 0, promo_discount_formatted: "₱0.00" }),
    );

    renderPage();

    expect(await screen.findByText("Senior/PWD discount")).toBeInTheDocument();
    expect(screen.getByText("₱28.00")).toBeInTheDocument();
    // Promo is genuinely zero this time — never shown as a zeroed tile.
    expect(screen.queryByText("Promo discount")).not.toBeInTheDocument();
  });

  it("omits both discount tiles when a range has neither", async () => {
    vi.mocked(reportsApi.fetchSalesSummary).mockResolvedValue(
      makeSalesSummary({ statutory_discount_cents: 0, promo_discount_cents: 0 }),
    );

    renderPage();

    await screen.findByText(makeSalesSummary().net_formatted);
    expect(screen.queryByText("Senior/PWD discount")).not.toBeInTheDocument();
    expect(screen.queryByText("Promo discount")).not.toBeInTheDocument();
  });

  it("shows a VAT summary row when the range has VAT-registered sales", async () => {
    vi.mocked(reportsApi.fetchSalesSummary).mockResolvedValue(
      makeSalesSummary({
        vatable_sales_cents: 25000,
        vatable_sales_formatted: "₱250.00",
        vat_cents: 3000,
        vat_formatted: "₱30.00",
        vat_exempt_sales_cents: 12500,
        vat_exempt_sales_formatted: "₱125.00",
      }),
    );

    renderPage();

    expect(await screen.findByText("VAT summary")).toBeInTheDocument();
    expect(screen.getByText("VATable sales")).toBeInTheDocument();
    expect(screen.getByText("₱250.00")).toBeInTheDocument();
    expect(screen.getByText("VAT-exempt sales")).toBeInTheDocument();
    expect(screen.getByText("₱125.00")).toBeInTheDocument();
  });

  it("omits the VAT summary row entirely for a range with no VAT-registered orders — never shows zeros", async () => {
    vi.mocked(reportsApi.fetchSalesSummary).mockResolvedValue(
      makeSalesSummary({ vatable_sales_cents: 0, vat_cents: 0, vat_exempt_sales_cents: 0, nonvat_sales_cents: 23000 }),
    );

    renderPage();

    await screen.findByText(makeSalesSummary().net_formatted);
    expect(screen.queryByText("VAT summary")).not.toBeInTheDocument();
    expect(screen.queryByText("VATable sales")).not.toBeInTheDocument();
  });
});
