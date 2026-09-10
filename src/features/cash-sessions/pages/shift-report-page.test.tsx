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
      "Cash sales (gross)",
      "Voided cash",
      "Cash in",
      "Cash out",
      "Confirmed remittances",
      "Expected cash",
      "Counted cash",
    ]) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
    // "Opening float" appears twice by design — once in the sales summary,
    // once in the cash reconciliation block, matching the panel's own row.
    expect(await screen.findAllByText("Opening float")).toHaveLength(2);
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
