import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CashDrawerPage } from "./cash-drawer-page";
import * as cashSessionsApi from "../api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/features/auth/store";
import { OWNER_PRESET } from "@/features/auth/permissions";
import {
  makeMovement,
  makeRegister,
  makeRegistersResponse,
  makeReconciliation,
  makeRemittance,
  makeSession,
  makeSessionsPage,
} from "../test-fixtures";

vi.mock("../api", () => ({
  fetchRegisters: vi.fn(),
  fetchCurrentSession: vi.fn(),
  fetchSessionHistory: vi.fn(),
  fetchSession: vi.fn(),
  openSession: vi.fn(),
  recordMovement: vi.fn(),
  createRemittance: vi.fn(),
  confirmRemittance: vi.fn(),
  closeSession: vi.fn(),
}));

function DetailProbe() {
  return <div>Session detail page</div>;
}

function renderCashDrawerPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/cash-drawer"]}>
        <Routes>
          <Route path="/app/cash-drawer" element={<CashDrawerPage />} />
          <Route path="/app/cash-drawer/sessions/:id" element={<DetailProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CashDrawerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // This file exercises the cash-drawer flows themselves, not permission
    // gating (see errors.test.ts / a dedicated permissions test for that) —
    // an owner fixture keeps every action visible, same as before F10.
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: {
        id: 1,
        name: "Merchant One",
        email: "merchant@gasa.test",
        roles: [],
        merchant: { id: 1, name: "Merchant One", status: "active" },
        permissions: [...OWNER_PRESET],
      },
      sessionNotice: null,
    });
    vi.mocked(cashSessionsApi.fetchRegisters).mockResolvedValue(makeRegistersResponse());
    vi.mocked(cashSessionsApi.fetchSessionHistory).mockResolvedValue(
      makeSessionsPage({ data: [] }),
    );
  });

  describe("no open session", () => {
    it("shows the open-cash-drawer panel with no register selector for a single register", async () => {
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({ data: null });

      renderCashDrawerPage();

      expect(await screen.findByText("The cash drawer is closed")).toBeInTheDocument();
      expect(screen.queryByLabelText("Register")).not.toBeInTheDocument();
    });

    it("shows a register selector when the merchant has more than one register", async () => {
      vi.mocked(cashSessionsApi.fetchRegisters).mockResolvedValue(
        makeRegistersResponse({
          data: [
            makeRegister({ id: 1, name: "Main Register", is_default: true }),
            makeRegister({ id: 2, name: "Drive-thru", is_default: false }),
          ],
        }),
      );
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({ data: null });

      renderCashDrawerPage();

      await screen.findByText("The cash drawer is closed");
      expect(screen.getByText("Register")).toBeInTheDocument();
    });

    it("opens the cash drawer with a float and shows the working view", async () => {
      const user = userEvent.setup();
      vi.mocked(cashSessionsApi.fetchCurrentSession)
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValue({ data: makeSession({ opening_float_cents: 50000 }) });
      vi.mocked(cashSessionsApi.openSession).mockResolvedValue(
        makeSession({ opening_float_cents: 50000 }),
      );

      renderCashDrawerPage();
      await screen.findByText("The cash drawer is closed");

      await user.type(screen.getByLabelText("Opening float"), "500");
      await user.click(screen.getByRole("button", { name: "Open cash drawer" }));

      await waitFor(() => {
        expect(cashSessionsApi.openSession).toHaveBeenCalledWith(
          expect.objectContaining({ opening_float_cents: 50000 }),
        );
      });

      expect(await screen.findByText("Expected cash")).toBeInTheDocument();
    });

    it("refetches current instead of showing a raw error on 409 session_already_open", async () => {
      const user = userEvent.setup();
      vi.mocked(cashSessionsApi.fetchCurrentSession)
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValue({ data: makeSession() });
      vi.mocked(cashSessionsApi.openSession).mockRejectedValue(
        new ApiError({
          status: 409,
          code: "session_already_open",
          message: "This register already has an open cash session.",
        }),
      );

      renderCashDrawerPage();
      await screen.findByText("The cash drawer is closed");

      await user.type(screen.getByLabelText("Opening float"), "500");
      await user.click(screen.getByRole("button", { name: "Open cash drawer" }));

      expect(await screen.findByText("Expected cash")).toBeInTheDocument();
      expect(screen.queryByText(/session_already_open/)).not.toBeInTheDocument();
    });
  });

  describe("open session", () => {
    it("renders the reconciliation panel with the headline expected cash figure", async () => {
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({
        data: makeSession({
          reconciliation: makeReconciliation({ expected_cash_cents: 123400 }),
        }),
      });

      renderCashDrawerPage();

      expect(await screen.findByText("Expected cash")).toBeInTheDocument();
      expect(screen.getByText("₱1,234.00")).toBeInTheDocument();
    });

    it("states that GCash is never counted as part of expected cash", async () => {
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({ data: makeSession() });

      renderCashDrawerPage();

      expect(
        await screen.findByText(/GCash sales are never counted as cash/),
      ).toBeInTheDocument();
    });

    it("shows movements and remittances lists", async () => {
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({
        data: makeSession({
          movements: [makeMovement({ id: 1, type: "cash_in", reason: "Top-up" })],
          remittances: [makeRemittance({ id: 1, status: "pending" })],
        }),
      });

      renderCashDrawerPage();

      expect(await screen.findByText("Top-up")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("shows empty states when there are no movements or remittances", async () => {
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({
        data: makeSession({ movements: [], remittances: [] }),
      });

      renderCashDrawerPage();

      expect(await screen.findByText("No movements yet.")).toBeInTheDocument();
      expect(screen.getByText("No remittances yet.")).toBeInTheDocument();
    });

    it("records a cash-in movement", async () => {
      const user = userEvent.setup();
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({
        data: makeSession({ movements: [], remittances: [] }),
      });
      vi.mocked(cashSessionsApi.recordMovement).mockResolvedValue(
        makeMovement({ type: "cash_in", amount_cents: 10000, reason: "Float top-up" }),
      );

      renderCashDrawerPage();
      await screen.findByText("Expected cash");

      await user.click(screen.getByRole("button", { name: "Record cash in" }));
      const dialog = await screen.findByRole("dialog");
      await user.type(within(dialog).getByLabelText("Amount"), "100");
      await user.type(within(dialog).getByLabelText("Reason"), "Float top-up");
      await user.click(within(dialog).getByRole("button", { name: "Record cash in" }));

      await waitFor(() => {
        expect(cashSessionsApi.recordMovement).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ type: "cash_in", amount_cents: 10000, reason: "Float top-up" }),
        );
      });
    });

    it("records a cash-out movement", async () => {
      const user = userEvent.setup();
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({
        data: makeSession({ movements: [], remittances: [] }),
      });
      vi.mocked(cashSessionsApi.recordMovement).mockResolvedValue(
        makeMovement({ type: "cash_out", amount_cents: 5000, reason: "Bank drop" }),
      );

      renderCashDrawerPage();
      await screen.findByText("Expected cash");

      await user.click(screen.getByRole("button", { name: "Record cash out" }));
      const dialog = await screen.findByRole("dialog");
      await user.type(within(dialog).getByLabelText("Amount"), "50");
      await user.type(within(dialog).getByLabelText("Reason"), "Bank drop");
      await user.click(within(dialog).getByRole("button", { name: "Record cash out" }));

      await waitFor(() => {
        expect(cashSessionsApi.recordMovement).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ type: "cash_out", amount_cents: 5000, reason: "Bank drop" }),
        );
      });
    });

    it("surfaces remittance_exceeds_cash as a plain-language message", async () => {
      const user = userEvent.setup();
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({
        data: makeSession({ movements: [], remittances: [] }),
      });
      vi.mocked(cashSessionsApi.createRemittance).mockRejectedValue(
        new ApiError({
          status: 422,
          code: "remittance_exceeds_cash",
          message: "The remittance amount exceeds the cash currently expected on hand (₱1,000.00).",
        }),
      );

      renderCashDrawerPage();
      await screen.findByText("Expected cash");

      await user.click(screen.getByRole("button", { name: "Record remittance" }));
      const dialog = await screen.findByRole("dialog");
      await user.type(within(dialog).getByLabelText("Amount"), "5000");
      await user.click(within(dialog).getByRole("button", { name: "Record remittance" }));

      expect(
        await screen.findByText(/exceeds the cash currently expected on hand/),
      ).toBeInTheDocument();
    });

    it("renders the second-user explanation on a 403 confirmation_requires_second_user", async () => {
      const user = userEvent.setup();
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({
        data: makeSession({
          movements: [],
          remittances: [makeRemittance({ id: 7, status: "pending" })],
        }),
      });
      vi.mocked(cashSessionsApi.confirmRemittance).mockRejectedValue(
        new ApiError({
          status: 403,
          code: "confirmation_requires_second_user",
          message: "A remittance must be confirmed by someone other than the person who created it.",
        }),
      );

      renderCashDrawerPage();
      await screen.findByText("Expected cash");

      await user.click(screen.getByRole("button", { name: "Confirm" }));

      expect(
        await screen.findByText(/a different user must confirm this remittance/i),
      ).toBeInTheDocument();
    });

    it("computes live variance in integer cents: over, short, and exact", async () => {
      const user = userEvent.setup();
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({
        data: makeSession({
          reconciliation: makeReconciliation({ expected_cash_cents: 100000 }),
        }),
      });

      renderCashDrawerPage();
      await screen.findByText("Expected cash");

      await user.click(screen.getByRole("button", { name: "Close cash drawer" }));
      const dialog = await screen.findByRole("dialog");
      const countedInput = within(dialog).getByLabelText("Counted cash");

      await user.type(countedInput, "1005");
      expect(within(dialog).getByText(/over/)).toBeInTheDocument();

      await user.clear(countedInput);
      await user.type(countedInput, "995");
      expect(within(dialog).getByText(/short/)).toBeInTheDocument();

      await user.clear(countedInput);
      await user.type(countedInput, "1000");
      expect(within(dialog).getByText("Exact")).toBeInTheDocument();
    });

    it("requires an explicit confirm step when variance is non-zero, then closes", async () => {
      const user = userEvent.setup();
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({
        data: makeSession({
          reconciliation: makeReconciliation({ expected_cash_cents: 100000 }),
        }),
      });
      vi.mocked(cashSessionsApi.closeSession).mockResolvedValue(
        makeSession({
          status: "closed",
          reconciliation: makeReconciliation({
            expected_cash_cents: 100000,
            counted_cash_cents: 99500,
            variance_cents: -500,
          }),
        }),
      );

      renderCashDrawerPage();
      await screen.findByText("Expected cash");

      await user.click(screen.getByRole("button", { name: "Close cash drawer" }));
      const dialog = await screen.findByRole("dialog");
      await user.type(within(dialog).getByLabelText("Counted cash"), "995");

      // First click only asks for confirmation — does not close yet.
      await user.click(within(dialog).getByRole("button", { name: "Close cash drawer" }));
      expect(cashSessionsApi.closeSession).not.toHaveBeenCalled();
      expect(screen.getByText(/Closing will record this variance permanently/)).toBeInTheDocument();

      await user.click(within(dialog).getByRole("button", { name: "Confirm and close cash drawer" }));

      await waitFor(() => {
        expect(cashSessionsApi.closeSession).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ counted_cash_cents: 99500 }),
        );
      });
      expect(await screen.findByText("Cash drawer closed")).toBeInTheDocument();
    });

    it("closes immediately with no confirm step when the count is exact", async () => {
      const user = userEvent.setup();
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({
        data: makeSession({
          reconciliation: makeReconciliation({ expected_cash_cents: 100000 }),
        }),
      });
      vi.mocked(cashSessionsApi.closeSession).mockResolvedValue(
        makeSession({
          status: "closed",
          reconciliation: makeReconciliation({
            expected_cash_cents: 100000,
            counted_cash_cents: 100000,
            variance_cents: 0,
          }),
        }),
      );

      renderCashDrawerPage();
      await screen.findByText("Expected cash");

      await user.click(screen.getByRole("button", { name: "Close cash drawer" }));
      const dialog = await screen.findByRole("dialog");
      await user.type(within(dialog).getByLabelText("Counted cash"), "1000");
      await user.click(within(dialog).getByRole("button", { name: "Close cash drawer" }));

      await waitFor(() => expect(cashSessionsApi.closeSession).toHaveBeenCalledTimes(1));
      expect(await screen.findByText("Cash drawer closed")).toBeInTheDocument();
    });

    it("disables Close cash drawer while the mutation is in flight", async () => {
      const user = userEvent.setup();
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({
        data: makeSession({
          reconciliation: makeReconciliation({ expected_cash_cents: 100000 }),
        }),
      });
      let resolveClose: (value: ReturnType<typeof makeSession>) => void = () => {};
      vi.mocked(cashSessionsApi.closeSession).mockReturnValue(
        new Promise((resolve) => {
          resolveClose = resolve;
        }),
      );

      renderCashDrawerPage();
      await screen.findByText("Expected cash");

      await user.click(screen.getByRole("button", { name: "Close cash drawer" }));
      const dialog = await screen.findByRole("dialog");
      await user.type(within(dialog).getByLabelText("Counted cash"), "1000");

      const closeButton = within(dialog).getByRole("button", { name: "Close cash drawer" });
      await user.click(closeButton);

      expect(within(dialog).getByRole("button", { name: "Closing…" })).toBeDisabled();

      resolveClose(
        makeSession({
          status: "closed",
          reconciliation: makeReconciliation({
            expected_cash_cents: 100000,
            counted_cash_cents: 100000,
            variance_cents: 0,
          }),
        }),
      );
      await screen.findByText("Cash drawer closed");
      expect(cashSessionsApi.closeSession).toHaveBeenCalledTimes(1);
    });

    it("handles 422 session_closed by refetching rather than double-closing", async () => {
      const user = userEvent.setup();
      vi.mocked(cashSessionsApi.fetchCurrentSession)
        .mockResolvedValueOnce({
          data: makeSession({ reconciliation: makeReconciliation({ expected_cash_cents: 100000 }) }),
        })
        .mockResolvedValue({ data: null });
      vi.mocked(cashSessionsApi.closeSession).mockRejectedValue(
        new ApiError({
          status: 422,
          code: "session_closed",
          message: "This cash session is already closed.",
        }),
      );

      renderCashDrawerPage();
      await screen.findByText("Expected cash");

      await user.click(screen.getByRole("button", { name: "Close cash drawer" }));
      const dialog = await screen.findByRole("dialog");
      await user.type(within(dialog).getByLabelText("Counted cash"), "1000");
      await user.click(within(dialog).getByRole("button", { name: "Close cash drawer" }));

      expect(await screen.findByText("The cash drawer is closed")).toBeInTheDocument();
    });
  });

  describe("history", () => {
    it("renders past sessions", async () => {
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({ data: null });
      vi.mocked(cashSessionsApi.fetchSessionHistory).mockResolvedValue(
        makeSessionsPage({
          data: [
            makeSession({
              id: 9,
              status: "closed",
              reconciliation: makeReconciliation({
                expected_cash_cents: 100000,
                counted_cash_cents: 99000,
                variance_cents: -1000,
              }),
            }),
          ],
        }),
      );

      renderCashDrawerPage();

      expect(await screen.findByText("₱990.00")).toBeInTheDocument();
      expect(screen.getByText(/short/)).toBeInTheDocument();
    });

    it("shows an empty state when there are no past sessions", async () => {
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({ data: null });
      vi.mocked(cashSessionsApi.fetchSessionHistory).mockResolvedValue(
        makeSessionsPage({ data: [] }),
      );

      renderCashDrawerPage();

      expect(await screen.findByText("No past sessions")).toBeInTheDocument();
    });

    it("navigates to the session detail page on row click", async () => {
      const user = userEvent.setup();
      vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({ data: null });
      vi.mocked(cashSessionsApi.fetchSessionHistory).mockResolvedValue(
        makeSessionsPage({ data: [makeSession({ id: 42, status: "closed" })] }),
      );

      renderCashDrawerPage();
      const row = await screen.findByText((_, element) => element?.tagName === "TR" && !!element.textContent?.includes("₱1,000.00"));
      await user.click(row);

      expect(await screen.findByText("Session detail page")).toBeInTheDocument();
    });
  });
});

describe("CashDrawerPage permission gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cashSessionsApi.fetchRegisters).mockResolvedValue(makeRegistersResponse());
    vi.mocked(cashSessionsApi.fetchSessionHistory).mockResolvedValue(
      makeSessionsPage({ data: [] }),
    );
  });

  function setUser(permissions: string[]) {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: {
        id: 2,
        name: "Staffer",
        email: "staff@gasa.test",
        roles: [],
        merchant: { id: 1, name: "Merchant One", status: "active" },
        permissions,
      },
      sessionNotice: null,
    });
  }

  it("staff preset: no open-drawer panel without drawer.open, with a plain explanation instead", async () => {
    setUser([]);
    vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({ data: null });

    renderCashDrawerPage();

    expect(await screen.findByText("The cash drawer is closed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open cash drawer" })).not.toBeInTheDocument();
    expect(screen.getByText(/opening it requires staff access/i)).toBeInTheDocument();
  });

  it("staff preset: shows Record cash in/out but hides Close and Confirm", async () => {
    setUser([...OWNER_PRESET].filter((p) => p !== "drawer.close" && p !== "remittances.confirm"));
    vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({
      data: makeSession({ remittances: [makeRemittance({ status: "pending" })] }),
    });

    renderCashDrawerPage();

    await screen.findByText("Movements");
    expect(screen.getByRole("button", { name: "Record cash in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record cash out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record remittance" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close cash drawer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  it("owner: shows every action, including Close and Confirm", async () => {
    setUser([...OWNER_PRESET]);
    vi.mocked(cashSessionsApi.fetchCurrentSession).mockResolvedValue({
      data: makeSession({ remittances: [makeRemittance({ status: "pending" })] }),
    });

    renderCashDrawerPage();

    await screen.findByText("Movements");
    expect(screen.getByRole("button", { name: "Close cash drawer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });
});
