import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardPage } from "./dashboard-page";
import { useAuthStore } from "@/features/auth/store";
import {
  setQueryClientClear,
  setSessionNavigator,
  SESSION_EXPIRED_MESSAGE,
} from "@/features/auth/session";
import * as ordersApi from "@/features/orders/api";
import * as kitchenApi from "@/features/kitchen-queue/api";
import * as reportsApi from "@/features/reports/api";
import { makeOrder, makeOrdersPage } from "@/features/orders/test-fixtures";
import { makeKitchenQueueSummary } from "@/features/kitchen-queue/test-fixtures";
import { makeSalesSummary } from "@/features/reports/test-fixtures";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

vi.mock("@/features/orders/api", () => ({
  fetchOrders: vi.fn(),
}));

vi.mock("@/features/kitchen-queue/api", () => ({
  fetchKitchenQueueSummary: vi.fn(),
}));

vi.mock("@/features/reports/api", () => ({
  fetchSalesSummary: vi.fn(),
  fetchSalesByDay: vi.fn(),
  fetchTopItems: vi.fn(),
}));

const user = {
  id: 1,
  name: "Merchant One",
  email: "merchant@gasa.test",
  roles: ["merchant"],
  merchant: { id: 1, name: "Merchant One", status: "active" as const },
};

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    useAuthStore.setState({ status: "authed", token: "tok", user, sessionNotice: null });
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(makeOrdersPage());
    vi.mocked(kitchenApi.fetchKitchenQueueSummary).mockResolvedValue(makeKitchenQueueSummary());
    vi.mocked(reportsApi.fetchSalesSummary).mockResolvedValue(makeSalesSummary());
  });

  it("renders the signed-in user's and merchant's name from the live /auth/me query", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(200, user));

    renderDashboard();

    expect(await screen.findByRole("heading", { name: /Merchant One/ })).toBeInTheDocument();
    expect(await screen.findByText(/Signed in as Merchant One/)).toBeInTheDocument();
  });

  it("a revoked token's 401 on the /auth/me query triggers session expiry, not a silent failure", async () => {
    const navigate = vi.fn();
    const clearCache = vi.fn();
    setSessionNavigator(navigate);
    setQueryClientClear(clearCache);
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(401, { message: "Unauthenticated." }),
    );

    renderDashboard();

    await waitFor(() => expect(useAuthStore.getState().status).toBe("guest"));
    expect(useAuthStore.getState().sessionNotice).toBe(SESSION_EXPIRED_MESSAGE);
    expect(navigate).toHaveBeenCalledWith("/login");
    expect(clearCache).toHaveBeenCalledTimes(1);
  });

  it("shows the pending-in-kitchen count and longest wait from the kitchen summary", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(200, user));
    vi.mocked(kitchenApi.fetchKitchenQueueSummary).mockResolvedValue(
      makeKitchenQueueSummary({ pending_count: 4, oldest_waiting_seconds: 754 }),
    );

    renderDashboard();

    expect(await screen.findByText("4")).toBeInTheDocument();
    expect(await screen.findByText("12m 34s")).toBeInTheDocument();
  });

  it("shows 'None waiting' rather than 0s when the kitchen queue is empty", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(200, user));
    vi.mocked(kitchenApi.fetchKitchenQueueSummary).mockResolvedValue(
      makeKitchenQueueSummary({ pending_count: 0, oldest_waiting_seconds: null }),
    );

    renderDashboard();

    expect(await screen.findByText("None waiting")).toBeInTheDocument();
    expect(screen.queryByText("0s")).not.toBeInTheDocument();
  });

  it("shows orders-today from the paginator's meta.total, without paging", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(200, user));
    vi.mocked(ordersApi.fetchOrders).mockImplementation((filters) => {
      // The "orders today" stat and the "recent orders" list both call
      // fetchOrders with different filters — only the date-filtered call
      // (perPage: 1) should drive the stat.
      if (filters?.perPage === 1) {
        return Promise.resolve(makeOrdersPage({ data: [], meta: { ...makeOrdersPage().meta, total: 7 } }));
      }
      return Promise.resolve(makeOrdersPage());
    });

    renderDashboard();

    expect(await screen.findByText("7")).toBeInTheDocument();
    // Exactly one call per distinct filter set — never a loop paging through results.
    const dateFilteredCalls = vi
      .mocked(ordersApi.fetchOrders)
      .mock.calls.filter(([filters]) => filters?.perPage === 1);
    expect(dateFilteredCalls).toHaveLength(1);
  });

  it("renders the five most recent orders with a link to each and to the full list", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(200, user));
    vi.mocked(ordersApi.fetchOrders).mockImplementation((filters) => {
      if (filters?.perPage === 5) {
        return Promise.resolve(
          makeOrdersPage({
            data: [
              makeOrder({ id: 9, order_number: "ORD-000009", total_cents: 12000 }),
              makeOrder({ id: 8, order_number: "ORD-000008", total_cents: 8000 }),
            ],
          }),
        );
      }
      return Promise.resolve(makeOrdersPage());
    });

    renderDashboard();

    const link = await screen.findByRole("link", { name: /ORD-000009/ });
    expect(link).toHaveAttribute("href", "/app/orders/9");
    expect(screen.getByRole("link", { name: "View all orders" })).toHaveAttribute(
      "href",
      "/app/orders",
    );
  });

  it("shows an empty state for recent orders when there are none yet", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(200, user));
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(makeOrdersPage({ data: [] }));

    renderDashboard();

    expect(await screen.findByText("No orders yet")).toBeInTheDocument();
    expect(screen.getByText("Ring up your first sale.")).toBeInTheDocument();
  });

  it("a failing kitchen-summary card shows its own error without breaking the rest of the page", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(200, user));
    vi.mocked(kitchenApi.fetchKitchenQueueSummary).mockRejectedValue(
      new Error("Couldn't load the kitchen summary."),
    );

    renderDashboard();

    // Both kitchen-derived cards (pending count, longest wait) share this
    // one query, so both surface the same error — expected, not a bug.
    expect(await screen.findAllByText("Couldn't load the kitchen summary.")).toHaveLength(2);
    // The rest of the page still renders — recent orders isn't dragged down with it.
    expect(await screen.findByText("View all orders")).toBeInTheDocument();
  });

  it("a failing orders-today card shows its own error independently", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(200, user));
    vi.mocked(ordersApi.fetchOrders).mockImplementation((filters) => {
      if (filters?.perPage === 1) {
        return Promise.reject(new Error("Couldn't load today's orders."));
      }
      return Promise.resolve(makeOrdersPage());
    });

    renderDashboard();

    expect(await screen.findByText("Couldn't load today's orders.")).toBeInTheDocument();
    // Kitchen stats still render fine, unaffected by the orders-today failure
    // (default fixture: pending_count 1, oldest_waiting_seconds 60 -> "1m 0s").
    expect(await screen.findByText("1m 0s")).toBeInTheDocument();
  });

  it("shows revenue today from sales-summary, filtered to today, and links to /app/reports", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(200, user));
    vi.mocked(reportsApi.fetchSalesSummary).mockResolvedValue(
      makeSalesSummary({ net_cents: 12345, net_formatted: "₱123.45" }),
    );

    renderDashboard();

    const link = await screen.findByRole("link", { name: /Revenue today/ });
    expect(link).toHaveAttribute("href", "/app/reports");
    expect(await screen.findByText("₱123.45")).toBeInTheDocument();
  });

  it("a failing revenue-today card shows its own error without breaking the rest of the page", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(200, user));
    vi.mocked(reportsApi.fetchSalesSummary).mockRejectedValue(new Error("Couldn't load revenue."));

    renderDashboard();

    expect(await screen.findByText("Couldn't load revenue.")).toBeInTheDocument();
    expect(await screen.findByText("View all orders")).toBeInTheDocument();
  });

  it("New order and Kitchen queue quick actions link to the right routes", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(200, user));

    renderDashboard();

    expect(await screen.findByRole("link", { name: /New order/ })).toHaveAttribute(
      "href",
      "/app/pos",
    );
    expect(screen.getByRole("link", { name: /Kitchen queue/ })).toHaveAttribute(
      "href",
      "/app/kitchen-queue",
    );
  });
});
