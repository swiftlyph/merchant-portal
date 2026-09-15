import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { OrderDetailPage } from "./order-detail-page";
import * as ordersApi from "../api";
import { ApiError } from "@/lib/api/client";
import { makeOrder, makeOrderBeneficiary, makeOrderTax } from "../test-fixtures";
import { useAuthStore } from "@/features/auth/store";
import { OWNER_PRESET, STAFF_PRESET } from "@/features/auth/permissions";

vi.mock("../api", () => ({
  fetchOrder: vi.fn(),
  completeOrder: vi.fn(),
  voidOrder: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderDetailPage(id = "1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/app/orders/${id}`]}>
        <Routes>
          <Route path="/app/orders/:id" element={<OrderDetailPage />} />
          <Route path="/app/orders" element={<div>Orders list page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("OrderDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // This file exercises the order transitions themselves, not permission
    // gating (see a dedicated permissions test for that) — an owner
    // fixture keeps both actions visible, same as before F10.
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
  });

  it("renders line items, add-ons, subtotal/discount/total from the server's formatted strings", async () => {
    vi.mocked(ordersApi.fetchOrder).mockResolvedValue(
      makeOrder({
        subtotal_cents: 34500,
        subtotal_formatted: "₱345.00",
        discount_cents: 5000,
        discount_formatted: "₱50.00",
        total_cents: 29500,
        total_formatted: "₱295.00",
        items: [
          {
            id: 9,
            product_id: 3,
            product_name: "Cappuccino",
            unit_price_cents: 14000,
            unit_price_formatted: "₱140.00",
            quantity: 1,
            line_total_cents: 16500,
            line_total_formatted: "₱165.00",
            beneficiary_id: null,
            discount_cents: 0,
            discount_formatted: "₱0.00",
            payable_cents: 16500,
            payable_formatted: "₱165.00",
            add_ons: [
              { id: 1, name: "Extra shot", price_cents: 2500, price_formatted: "₱25.00" },
            ],
          },
        ],
      }),
    );

    renderDetailPage();

    expect(await screen.findByText("Cappuccino")).toBeInTheDocument();
    expect(screen.getByText("Extra shot (+₱25.00)")).toBeInTheDocument();
    expect(screen.getByText("₱345.00")).toBeInTheDocument(); // subtotal
    expect(screen.getByText("-₱50.00")).toBeInTheDocument(); // discount
    expect(screen.getByText("₱295.00")).toBeInTheDocument(); // total
  });

  it("shows the cash/gcash breakdown for a split payment", async () => {
    vi.mocked(ordersApi.fetchOrder).mockResolvedValue(
      makeOrder({
        payment_method: "split",
        cash_cents: 14750,
        cash_formatted: "₱147.50",
        gcash_cents: 14750,
        gcash_formatted: "₱147.50",
      }),
    );

    renderDetailPage();

    expect(await screen.findByText("Split")).toBeInTheDocument();
    expect(screen.getByText(/Cash ₱147.50/)).toBeInTheDocument();
    expect(screen.getByText(/GCash ₱147.50/)).toBeInTheDocument();
  });

  it("shows a clean not-found state on a 404, not a crash", async () => {
    vi.mocked(ordersApi.fetchOrder).mockRejectedValue(
      new ApiError({ status: 404, message: "Order not found.", code: "not_found" }),
    );

    renderDetailPage("999");

    expect(await screen.findByText("Order not found")).toBeInTheDocument();
  });

  it("renders Complete and Void buttons for a pending order", async () => {
    vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder({ status: "pending" }));

    renderDetailPage();

    expect(await screen.findByRole("button", { name: "Complete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Void" })).toBeInTheDocument();
  });

  it.each(["completed", "voided"] as const)(
    "does not render transition buttons for a %s order",
    async (status) => {
      vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder({ status }));

      renderDetailPage();

      await screen.findByText(makeOrder().order_number);
      expect(screen.queryByRole("button", { name: "Complete" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Void" })).not.toBeInTheDocument();
    },
  );

  it("completing an order calls the endpoint behind a confirm dialog and invalidates queries", async () => {
    vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder({ status: "pending" }));
    vi.mocked(ordersApi.completeOrder).mockResolvedValue(makeOrder({ status: "completed" }));

    renderDetailPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Complete" }));
    expect(await screen.findByText("Complete this order?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Complete order" }));

    await waitFor(() => expect(ordersApi.completeOrder).toHaveBeenCalledWith("1"));
    expect(toast.success).toHaveBeenCalled();
  });

  it("void's confirm dialog states it cannot be undone", async () => {
    vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder({ status: "pending" }));

    renderDetailPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Void" }));

    expect(await screen.findByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it("opens the void confirm dialog without a 'Function components cannot be given refs' warning", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder({ status: "pending" }));

    renderDetailPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Void" }));
    await screen.findByRole("alertdialog");

    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("Function components cannot be given refs"),
      expect.anything(),
      expect.anything(),
    );
    consoleError.mockRestore();
  });

  it("voiding an order calls the endpoint and invalidates queries", async () => {
    vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder({ status: "pending" }));
    vi.mocked(ordersApi.voidOrder).mockResolvedValue(makeOrder({ status: "voided" }));

    renderDetailPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Void" }));
    await user.click(await screen.findByRole("button", { name: "Void order" }));

    await waitFor(() => expect(ordersApi.voidOrder).toHaveBeenCalledWith("1"));
    expect(toast.success).toHaveBeenCalled();
  });

  it("shows a toast and refetches on a 422 invalid_transition race", async () => {
    vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder({ status: "pending" }));
    vi.mocked(ordersApi.completeOrder).mockRejectedValue(
      new ApiError({
        status: 422,
        message: "Already completed.",
        code: "invalid_transition",
      }),
    );

    renderDetailPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Complete" }));
    await user.click(screen.getByRole("button", { name: "Complete order" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "This order already changed status.",
        expect.objectContaining({ description: expect.any(String) }),
      ),
    );
    // The success toast must not fire on this path.
    expect(toast.success).not.toHaveBeenCalled();
    // fetchOrder is called once on mount, again once the invalidated query refetches.
    await waitFor(() => expect(ordersApi.fetchOrder).toHaveBeenCalledTimes(2));
  });
});

describe("OrderDetailPage permission gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder());
  });

  it("staff (orders.complete, no orders.void): shows Complete, hides Void", async () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: {
        id: 2,
        name: "Staffer",
        email: "staff@gasa.test",
        roles: [],
        merchant: { id: 1, name: "Merchant One", status: "active" },
        permissions: [...STAFF_PRESET],
      },
      sessionNotice: null,
    });

    renderDetailPage();

    expect(await screen.findByRole("button", { name: "Complete" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Void" })).not.toBeInTheDocument();
  });

  it("owner: shows both Complete and Void", async () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: {
        id: 1,
        name: "Owner",
        email: "merchant@gasa.test",
        roles: [],
        merchant: { id: 1, name: "Merchant One", status: "active" },
        permissions: [...OWNER_PRESET],
      },
      sessionNotice: null,
    });

    renderDetailPage();

    expect(await screen.findByRole("button", { name: "Complete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Void" })).toBeInTheDocument();
  });

  it("with neither permission: shows no action buttons at all", async () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: {
        id: 3,
        name: "Viewer",
        email: "viewer@gasa.test",
        roles: [],
        merchant: { id: 1, name: "Merchant One", status: "active" },
        permissions: ["orders.view"],
      },
      sessionNotice: null,
    });

    renderDetailPage();

    await screen.findByText("ORD-000001");
    expect(screen.queryByRole("button", { name: "Complete" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Void" })).not.toBeInTheDocument();
  });

  it("shows Print receipt with orders.view", async () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: {
        id: 3,
        name: "Viewer",
        email: "viewer@gasa.test",
        roles: [],
        merchant: { id: 1, name: "Merchant One", status: "active" },
        permissions: ["orders.view"],
      },
      sessionNotice: null,
    });

    renderDetailPage();

    expect(await screen.findByRole("link", { name: /Print receipt/ })).toBeInTheDocument();
  });

  it("hides Print receipt without orders.view", async () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: {
        id: 4,
        name: "No Access",
        email: "noaccess@gasa.test",
        roles: [],
        merchant: { id: 1, name: "Merchant One", status: "active" },
        permissions: [],
      },
      sessionNotice: null,
    });

    renderDetailPage();

    await screen.findByText("ORD-000001");
    expect(screen.queryByRole("link", { name: /Print receipt/ })).not.toBeInTheDocument();
  });
});

describe("OrderDetailPage — F13/P10 tax & senior/PWD discount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it("shows the VAT breakdown with real legal terms for a VAT-registered order", async () => {
    vi.mocked(ordersApi.fetchOrder).mockResolvedValue(
      makeOrder({
        tax: makeOrderTax({
          vat_registered: true,
          vat_rate_bps: 1200,
          vatable_sales_cents: 12500,
          vatable_sales_formatted: "₱125.00",
          vat_cents: 1500,
          vat_formatted: "₱15.00",
          vat_exempt_sales_cents: 0,
          vat_exempt_sales_formatted: "₱0.00",
        }),
      }),
    );

    renderDetailPage();

    expect(await screen.findByText("VAT breakdown")).toBeInTheDocument();
    expect(screen.getByText("VATable sales")).toBeInTheDocument();
    expect(screen.getByText("₱125.00")).toBeInTheDocument();
    expect(screen.getByText("VAT (12%)")).toBeInTheDocument();
    expect(screen.getByText("₱15.00")).toBeInTheDocument();
    expect(screen.getByText("VAT-exempt sales")).toBeInTheDocument();
    expect(screen.queryByText("Non-VAT sale.")).not.toBeInTheDocument();
  });

  it("shows the Non-VAT note and no VAT figures for a non-VAT order", async () => {
    vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder({ tax: makeOrderTax({ vat_registered: false }) }));

    renderDetailPage();

    expect(await screen.findByText("Non-VAT sale.")).toBeInTheDocument();
    expect(screen.queryByText("VAT breakdown")).not.toBeInTheDocument();
    expect(screen.queryByText("VATable sales")).not.toBeInTheDocument();
  });

  it("shows each beneficiary's name, ID, and discount", async () => {
    vi.mocked(ordersApi.fetchOrder).mockResolvedValue(
      makeOrder({
        beneficiaries: [
          makeOrderBeneficiary({ name: "Lola Remedios", id_number: "SC-2020-0001", discount_cents: 2800, discount_formatted: "₱28.00" }),
        ],
        tax: makeOrderTax({ statutory_discount_cents: 2800, statutory_discount_formatted: "₱28.00" }),
      }),
    );

    renderDetailPage();

    expect(await screen.findByText("Lola Remedios")).toBeInTheDocument();
    expect(screen.getByText(/SC-2020-0001/)).toBeInTheDocument();
    // Appears twice by design: once in the totals breakdown (the statutory
    // portion of the combined Discount line), once on the beneficiary's
    // own row.
    expect(screen.getAllByText("-₱28.00").length).toBeGreaterThan(0);
  });

  it("shows no beneficiary section for an ordinary order", async () => {
    vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder());

    renderDetailPage();

    await screen.findByText("ORD-000001");
    expect(screen.queryByText("Senior/PWD discount")).not.toBeInTheDocument();
  });

  it("shows the statutory/promo split under the combined Discount line only when applicable", async () => {
    vi.mocked(ordersApi.fetchOrder).mockResolvedValue(
      makeOrder({
        discount_cents: 3800,
        discount_formatted: "₱38.00",
        tax: makeOrderTax({
          statutory_discount_cents: 2800,
          statutory_discount_formatted: "₱28.00",
          promo_discount_cents: 1000,
          promo_discount_formatted: "₱10.00",
        }),
      }),
    );

    renderDetailPage();

    expect(await screen.findByText("Senior/PWD discount")).toBeInTheDocument();
    expect(screen.getByText("-₱28.00")).toBeInTheDocument();
    expect(screen.getByText("Promo discount")).toBeInTheDocument();
    expect(screen.getByText("-₱10.00")).toBeInTheDocument();
  });
});
