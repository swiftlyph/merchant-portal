import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuditLogPage } from "./audit-log-page";
import * as auditLogApi from "../api";
import { ApiError } from "@/lib/api/client";
import { makeAuditLogEntry, makeAuditLogPage } from "../test-fixtures";

vi.mock("../api", () => ({
  fetchAuditLog: vi.fn(),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderAuditLogPage(initialEntry = "/app/audit-log") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/app/audit-log" element={<AuditLogPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AuditLogPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders entries from the list query", async () => {
    vi.mocked(auditLogApi.fetchAuditLog).mockResolvedValue(
      makeAuditLogPage({
        data: [
          makeAuditLogEntry({ id: 1, action: "order.checked_out" }),
          makeAuditLogEntry({ id: 2, action: "order.voided" }),
        ],
      }),
    );

    renderAuditLogPage();

    expect(await screen.findByText("Order checked out")).toBeInTheDocument();
    expect(screen.getByText("Order voided")).toBeInTheDocument();
    expect(screen.getAllByText("Jane Owner").length).toBeGreaterThan(0);
  });

  it("shows a loading skeleton before data arrives", () => {
    vi.mocked(auditLogApi.fetchAuditLog).mockReturnValue(new Promise(() => {}));

    renderAuditLogPage();

    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("shows an empty state when there are no entries", async () => {
    vi.mocked(auditLogApi.fetchAuditLog).mockResolvedValue(makeAuditLogPage({ data: [] }));

    renderAuditLogPage();

    expect(await screen.findByText("No activity found")).toBeInTheDocument();
  });

  it("shows an error state with a retry button that refetches", async () => {
    vi.mocked(auditLogApi.fetchAuditLog)
      .mockRejectedValueOnce(new ApiError({ status: 500, message: "Server error." }))
      .mockResolvedValueOnce(makeAuditLogPage());

    renderAuditLogPage();

    expect(await screen.findByText("Server error.")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Order checked out")).toBeInTheDocument();
    expect(auditLogApi.fetchAuditLog).toHaveBeenCalledTimes(2);
  });

  it("initializes filters from the URL and calls the API with them", async () => {
    vi.mocked(auditLogApi.fetchAuditLog).mockResolvedValue(makeAuditLogPage());

    renderAuditLogPage("/app/audit-log?action=order.voided&from=2026-09-01&to=2026-09-08&page=2");

    await waitFor(() =>
      expect(auditLogApi.fetchAuditLog).toHaveBeenCalledWith({
        action: "order.voided",
        from: "2026-09-01",
        to: "2026-09-08",
        page: 2,
      }),
    );
  });

  it("opens the detail sheet with old/new values when a row is clicked", async () => {
    vi.mocked(auditLogApi.fetchAuditLog).mockResolvedValue(
      makeAuditLogPage({
        data: [
          makeAuditLogEntry({
            action: "profile.updated",
            old_values: { legal_name: "Old Name" },
            new_values: { legal_name: "New Name" },
          }),
        ],
      }),
    );

    renderAuditLogPage();
    const user = userEvent.setup();

    await user.click(await screen.findByText("Profile updated"));

    expect(await screen.findByText("Before")).toBeInTheDocument();
    expect(screen.getByText("Old Name")).toBeInTheDocument();
    expect(screen.getByText("New Name")).toBeInTheDocument();
  });

  it("clear filters resets action/from/to and refetches", async () => {
    vi.mocked(auditLogApi.fetchAuditLog).mockResolvedValue(makeAuditLogPage());
    renderAuditLogPage("/app/audit-log?action=order.voided&from=2026-09-01&to=2026-09-08");
    const user = userEvent.setup();

    await screen.findByText("Order checked out");
    await user.click(await screen.findByRole("button", { name: "Clear filters" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/app/audit-log"),
    );
    await waitFor(() =>
      expect(auditLogApi.fetchAuditLog).toHaveBeenLastCalledWith({
        action: undefined,
        from: undefined,
        to: undefined,
        page: 1,
      }),
    );
  });
});
