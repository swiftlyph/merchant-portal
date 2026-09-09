import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecentOrdersCard } from "./recent-orders-card";
import * as ordersApi from "@/features/orders/api";
import { makeOrder, makeOrdersPage } from "@/features/orders/test-fixtures";

vi.mock("@/features/orders/api", () => ({
  fetchOrders: vi.fn(),
}));

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RecentOrdersCard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RecentOrdersCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests only the 5 most recent orders", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(makeOrdersPage());
    renderCard();

    await screen.findByText("ORD-000001");
    expect(ordersApi.fetchOrders).toHaveBeenCalledWith({ perPage: 5, page: 1 });
  });

  it("renders order number, time, total, and status badge per row, linking to the order", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(
      makeOrdersPage({
        data: [makeOrder({ id: 3, order_number: "ORD-000003", total_cents: 9000, status: "completed" })],
      }),
    );
    renderCard();

    const link = await screen.findByRole("link", { name: /ORD-000003/ });
    expect(link).toHaveAttribute("href", "/app/orders/3");
    expect(screen.getByText("₱90.00")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows a friendly empty state for a merchant with no orders yet", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(makeOrdersPage({ data: [] }));
    renderCard();

    expect(await screen.findByText("No orders yet")).toBeInTheDocument();
    expect(screen.getByText("Ring up your first sale.")).toBeInTheDocument();
  });

  it("shows a card-local error with retry, without needing the rest of the page", async () => {
    vi.mocked(ordersApi.fetchOrders).mockRejectedValueOnce(new Error("Server error."));
    vi.mocked(ordersApi.fetchOrders).mockResolvedValueOnce(makeOrdersPage());
    renderCard();

    expect(await screen.findByText("Server error.")).toBeInTheDocument();

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("ORD-000001")).toBeInTheDocument();
  });

  it("always links to the full orders list", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(makeOrdersPage());
    renderCard();

    await screen.findByText("ORD-000001");
    expect(screen.getByRole("link", { name: "View all orders" })).toHaveAttribute(
      "href",
      "/app/orders",
    );
  });
});
