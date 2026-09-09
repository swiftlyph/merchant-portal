import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OrdersPage } from "./orders-page";
import * as ordersApi from "../api";
import { ApiError } from "@/lib/api/client";
import { makeOrder, makeOrdersPage } from "../test-fixtures";

vi.mock("../api", () => ({
  fetchOrders: vi.fn(),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function DetailProbe() {
  const location = useLocation();
  return <div>Detail page at {location.pathname}</div>;
}

function renderOrdersPage(initialEntry = "/app/orders") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/app/orders" element={<OrdersPage />} />
          <Route path="/app/orders/:id" element={<DetailProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("OrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders order rows from the list query", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(
      makeOrdersPage({
        data: [
          makeOrder({ id: 1, order_number: "ORD-000001", total_cents: 15000 }),
          makeOrder({ id: 2, order_number: "ORD-000002", total_cents: 20000, status: "completed" }),
        ],
      }),
    );

    renderOrdersPage();

    expect(await screen.findByText("ORD-000001")).toBeInTheDocument();
    expect(screen.getByText("ORD-000002")).toBeInTheDocument();
    expect(screen.getByText("₱150.00")).toBeInTheDocument();
    expect(screen.getByText("₱200.00")).toBeInTheDocument();
  });

  it("shows a loading skeleton before data arrives", () => {
    vi.mocked(ordersApi.fetchOrders).mockReturnValue(new Promise(() => {}));

    renderOrdersPage();

    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("shows an empty state when there are no orders", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(makeOrdersPage({ data: [] }));

    renderOrdersPage();

    expect(await screen.findByText("No orders found")).toBeInTheDocument();
  });

  it("shows an error state with a retry button that refetches", async () => {
    vi.mocked(ordersApi.fetchOrders)
      .mockRejectedValueOnce(new ApiError({ status: 500, message: "Server error." }))
      .mockResolvedValueOnce(makeOrdersPage({ data: [makeOrder()] }));

    renderOrdersPage();

    expect(await screen.findByText("Server error.")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("ORD-000001")).toBeInTheDocument();
    expect(ordersApi.fetchOrders).toHaveBeenCalledTimes(2);
  });

  it("navigates to the order detail route when a row is clicked", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(
      makeOrdersPage({ data: [makeOrder({ id: 7, order_number: "ORD-000007" })] }),
    );

    renderOrdersPage();
    const user = userEvent.setup();

    await user.click(await screen.findByText("ORD-000007"));

    expect(await screen.findByText("Detail page at /app/orders/7")).toBeInTheDocument();
  });

  it("initializes filters from the URL and calls the API with them", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(makeOrdersPage());

    renderOrdersPage("/app/orders?status=completed&date=2026-09-08&page=2");

    await waitFor(() =>
      expect(ordersApi.fetchOrders).toHaveBeenCalledWith({
        status: "completed",
        date: "2026-09-08",
        page: 2,
      }),
    );
  });

  it("changing the status filter updates the URL and refetches", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(makeOrdersPage());
    renderOrdersPage();
    const user = userEvent.setup();

    await screen.findByRole("combobox");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Pending" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/app/orders?status=pending"),
    );
    await waitFor(() =>
      expect(ordersApi.fetchOrders).toHaveBeenLastCalledWith({
        status: "pending",
        date: undefined,
        page: 1,
      }),
    );
  });

  it("changing the date filter updates the URL and refetches", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(makeOrdersPage());
    renderOrdersPage();

    const dateInput = await screen.findByLabelText("Date");
    // fireEvent avoids userEvent's char-by-char typing on a native date input.
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(dateInput, { target: { value: "2026-09-05" } });

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("date=2026-09-05"),
    );
    await waitFor(() =>
      expect(ordersApi.fetchOrders).toHaveBeenLastCalledWith({
        status: undefined,
        date: "2026-09-05",
        page: 1,
      }),
    );
  });

  it("filters the currently-loaded rows by order number via the search box, client-side", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(
      makeOrdersPage({
        data: [
          makeOrder({ id: 1, order_number: "ORD-000001" }),
          makeOrder({ id: 2, order_number: "ORD-000002" }),
        ],
      }),
    );
    renderOrdersPage();
    const user = userEvent.setup();

    await screen.findByText("ORD-000001");
    await user.type(screen.getByLabelText("Search"), "000002");

    expect(screen.queryByText("ORD-000001")).not.toBeInTheDocument();
    expect(screen.getByText("ORD-000002")).toBeInTheDocument();
    // Search is client-side over the already-fetched page — never sent to the API.
    for (const call of vi.mocked(ordersApi.fetchOrders).mock.calls) {
      expect(call[0]).not.toHaveProperty("q");
    }
  });

  it("reflects the search term in the URL and shows a no-match empty state", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(
      makeOrdersPage({ data: [makeOrder({ order_number: "ORD-000001" })] }),
    );
    renderOrdersPage();
    const user = userEvent.setup();

    await screen.findByText("ORD-000001");
    await user.type(screen.getByLabelText("Search"), "nope");

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("q=nope"));
    expect(await screen.findByText("No orders found")).toBeInTheDocument();
    expect(screen.getByText('No orders on this page match "nope".')).toBeInTheDocument();
  });

  it("clear filters also clears the search box", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(
      makeOrdersPage({ data: [makeOrder({ order_number: "ORD-000001" })] }),
    );
    renderOrdersPage("/app/orders?q=nope");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Clear filters" }));

    expect(screen.getByLabelText("Search")).toHaveValue("");
    expect(await screen.findByText("ORD-000001")).toBeInTheDocument();
  });

  it("paginates using links/meta and reflects the page in the URL", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(
      makeOrdersPage({
        meta: {
          current_page: 1,
          from: 1,
          last_page: 3,
          links: [],
          path: "/api/v1/merchant/orders",
          per_page: 10,
          to: 10,
          total: 30,
        },
      }),
    );
    renderOrdersPage();
    const user = userEvent.setup();

    expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();
    const nextButton = within(screen.getByRole("navigation")).getByRole("link", {
      name: /go to next page/i,
    });
    await user.click(nextButton);

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("page=2"),
    );
  });
});
