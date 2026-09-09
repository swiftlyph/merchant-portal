import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionDetailPage } from "./session-detail-page";
import * as cashSessionsApi from "../api";
import { ApiError } from "@/lib/api/client";
import { makeMovement, makeReconciliation, makeRemittance, makeSession } from "../test-fixtures";

vi.mock("../api", () => ({
  fetchSession: vi.fn(),
}));

function renderDetailPage(id = "1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/app/cash-drawer/sessions/${id}`]}>
        <Routes>
          <Route path="/app/cash-drawer/sessions/:id" element={<SessionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SessionDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a closed session's final figures, movements and remittances", async () => {
    vi.mocked(cashSessionsApi.fetchSession).mockResolvedValue(
      makeSession({
        id: 5,
        status: "closed",
        closed_at: "2026-09-10T10:00:00.000Z",
        reconciliation: makeReconciliation({
          expected_cash_cents: 100000,
          counted_cash_cents: 99500,
          variance_cents: -500,
        }),
        movements: [makeMovement({ id: 1, reason: "Bank drop", type: "cash_out" })],
        remittances: [makeRemittance({ id: 1, status: "confirmed" })],
      }),
    );

    renderDetailPage("5");

    expect(await screen.findByText("Session #5")).toBeInTheDocument();
    expect(screen.getByText("Bank drop")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText(/short/)).toBeInTheDocument();
  });

  it("shows a not-found message for a 404", async () => {
    vi.mocked(cashSessionsApi.fetchSession).mockRejectedValue(
      new ApiError({ status: 404, message: "Not found." }),
    );

    renderDetailPage("999");

    expect(await screen.findByText("Session not found")).toBeInTheDocument();
  });
});
