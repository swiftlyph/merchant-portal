import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { KitchenQueuePage } from "./kitchen-queue-page";
import * as kitchenApi from "../api";
import * as ordersApi from "@/features/orders/api";
import { ApiError } from "@/lib/api/client";
import { makeKitchenOrder, makeKitchenQueueResponse, makeKitchenQueueSummary } from "../test-fixtures";

vi.mock("../api", () => ({
  fetchKitchenQueue: vi.fn(),
  fetchKitchenQueueSummary: vi.fn(),
}));

vi.mock("@/features/orders/api", () => ({
  completeOrder: vi.fn(),
  voidOrder: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderPage(initialEntry = "/app/kitchen-queue") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/app/kitchen-queue" element={<KitchenQueuePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("KitchenQueuePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    vi.mocked(kitchenApi.fetchKitchenQueueSummary).mockResolvedValue(
      makeKitchenQueueSummary({ pending_count: 2 }),
    );
  });

  it("renders tickets in the server-given FIFO order without re-sorting", async () => {
    vi.mocked(kitchenApi.fetchKitchenQueue).mockResolvedValue(
      makeKitchenQueueResponse({
        data: [
          makeKitchenOrder({ id: 1, order_number: "ORD-000001", waiting_seconds: 600 }),
          makeKitchenOrder({ id: 2, order_number: "ORD-000002", waiting_seconds: 60 }),
        ],
      }),
    );

    renderPage();

    const orderNumbers = await screen.findAllByText(/ORD-\d{6}/);
    expect(orderNumbers.map((el) => el.textContent)).toEqual(["ORD-000001", "ORD-000002"]);
  });

  it("the table view renders the same data as the ticket view", async () => {
    vi.mocked(kitchenApi.fetchKitchenQueue).mockResolvedValue(
      makeKitchenQueueResponse({
        data: [makeKitchenOrder({ id: 1, order_number: "ORD-000001" })],
      }),
    );

    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByText("ORD-000001")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Table" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("ORD-000001")).toBeInTheDocument();
  });

  it("persists the view switcher choice to localStorage and across a remount", async () => {
    vi.mocked(kitchenApi.fetchKitchenQueue).mockResolvedValue(makeKitchenQueueResponse());

    const { unmount } = renderPage();
    const user = userEvent.setup();

    await screen.findByText("ORD-000001");
    await user.click(screen.getByRole("tab", { name: "Table" }));
    await waitFor(() => expect(screen.getByRole("tab", { name: "Table" })).toHaveAttribute("data-state", "active"));

    unmount();

    renderPage(); // fresh mount, no ?view= in the URL this time
    await screen.findByText("ORD-000001");
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Table" })).toHaveAttribute("data-state", "active"),
    );
  });

  it("completes a ticket on the third click and not before", async () => {
    vi.mocked(kitchenApi.fetchKitchenQueue).mockResolvedValue(
      makeKitchenQueueResponse({ data: [makeKitchenOrder({ id: 1, order_number: "ORD-000001" })] }),
    );
    vi.mocked(ordersApi.completeOrder).mockResolvedValue({} as never);

    renderPage();
    const user = userEvent.setup();

    const ticket = await screen.findByRole("button", { name: /^Order ORD-000001,/ });

    await user.click(ticket);
    expect(ordersApi.completeOrder).not.toHaveBeenCalled();
    await user.click(ticket);
    expect(ordersApi.completeOrder).not.toHaveBeenCalled();
    await user.click(ticket);

    await waitFor(() => expect(ordersApi.completeOrder).toHaveBeenCalledWith(1));
  });

  it("the keyboard path (Enter x3) completes a ticket too", async () => {
    vi.mocked(kitchenApi.fetchKitchenQueue).mockResolvedValue(
      makeKitchenQueueResponse({ data: [makeKitchenOrder({ id: 1, order_number: "ORD-000001" })] }),
    );
    vi.mocked(ordersApi.completeOrder).mockResolvedValue({} as never);

    renderPage();
    const user = userEvent.setup();

    const ticket = await screen.findByRole("button", { name: /^Order ORD-000001,/ });
    ticket.focus();

    await user.keyboard("{Enter}{Enter}{Enter}");

    await waitFor(() => expect(ordersApi.completeOrder).toHaveBeenCalledWith(1));
  });

  it("an explicit 'Complete order' menu action completes without any clicking", async () => {
    vi.mocked(kitchenApi.fetchKitchenQueue).mockResolvedValue(
      makeKitchenQueueResponse({ data: [makeKitchenOrder({ id: 1, order_number: "ORD-000001" })] }),
    );
    vi.mocked(ordersApi.completeOrder).mockResolvedValue({} as never);

    renderPage();
    const user = userEvent.setup();

    await screen.findByText("ORD-000001");
    await user.click(screen.getByRole("button", { name: /more actions for order ord-000001/i }));
    await user.click(await screen.findByRole("menuitem", { name: "Complete order" }));

    await waitFor(() => expect(ordersApi.completeOrder).toHaveBeenCalledWith(1));
  });

  it("a 422 invalid_transition removes the ticket and shows a toast, without a dead ticket left on screen", async () => {
    vi.mocked(kitchenApi.fetchKitchenQueue)
      .mockResolvedValueOnce(
        makeKitchenQueueResponse({ data: [makeKitchenOrder({ id: 1, order_number: "ORD-000001" })] }),
      )
      .mockResolvedValueOnce(makeKitchenQueueResponse({ data: [] }));
    vi.mocked(ordersApi.completeOrder).mockRejectedValue(
      new ApiError({ status: 422, message: "Already completed.", code: "invalid_transition" }),
    );

    renderPage();
    const user = userEvent.setup();

    const ticket = await screen.findByRole("button", { name: /^Order ORD-000001,/ });
    await user.click(ticket);
    await user.click(ticket);
    await user.click(ticket);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("ORD-000001")).not.toBeInTheDocument());
  });

  it("shows a calm empty state when the queue is empty", async () => {
    vi.mocked(kitchenApi.fetchKitchenQueue).mockResolvedValue(makeKitchenQueueResponse({ data: [] }));
    vi.mocked(kitchenApi.fetchKitchenQueueSummary).mockResolvedValue(
      makeKitchenQueueSummary({ pending_count: 0, oldest_waiting_seconds: null }),
    );

    renderPage();

    expect(await screen.findByText("No orders in the queue")).toBeInTheDocument();
  });

  it("shows a truncation notice when pending_count exceeds the returned list length", async () => {
    vi.mocked(kitchenApi.fetchKitchenQueue).mockResolvedValue(
      makeKitchenQueueResponse({ data: [makeKitchenOrder({ id: 1, order_number: "ORD-000001" })] }),
    );
    vi.mocked(kitchenApi.fetchKitchenQueueSummary).mockResolvedValue(
      makeKitchenQueueSummary({ pending_count: 250 }),
    );

    renderPage();

    expect(await screen.findByText("Showing first 1 of 250 pending orders.")).toBeInTheDocument();
  });

  it("reflects the all-days toggle in the URL and calls the API with it", async () => {
    vi.mocked(kitchenApi.fetchKitchenQueue).mockResolvedValue(makeKitchenQueueResponse());

    renderPage();
    const user = userEvent.setup();

    await screen.findByText("ORD-000001");
    await user.click(screen.getByRole("button", { name: "Today only" }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("all=1"));
    await waitFor(() =>
      expect(kitchenApi.fetchKitchenQueue).toHaveBeenLastCalledWith({ all: true }),
    );
  });

  it("renders no money anywhere on the page", async () => {
    vi.mocked(kitchenApi.fetchKitchenQueue).mockResolvedValue(
      makeKitchenQueueResponse({
        data: [makeKitchenOrder({ id: 1, order_number: "ORD-000001" })],
      }),
    );

    const { container } = renderPage();
    await screen.findByText("ORD-000001");

    const text = container.textContent ?? "";
    expect(text).not.toMatch(/₱/);
    expect(text.toLowerCase()).not.toContain("total");
    expect(text.toLowerCase()).not.toContain("price");
  });
});
