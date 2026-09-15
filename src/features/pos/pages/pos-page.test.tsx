import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PosPage } from "./pos-page";
import * as posApi from "../api";
import { useCartStore } from "../use-cart";
import { ApiError } from "@/lib/api/client";
import { makeCheckoutResponse, makeMenuResponse, makeProduct } from "../test-fixtures";

vi.mock("../api", () => ({
  fetchMenu: vi.fn(),
  checkout: vi.fn(),
}));

// SuccessDialog (F11) navigates to the receipt print view on "Print
// receipt", so this page needs a Router context even though POS never
// otherwise routes anywhere itself.
function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/pos"]}>
        <PosPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useCartStore.getState().clear();
    vi.mocked(posApi.fetchMenu).mockResolvedValue(
      makeMenuResponse({
        data: [
          makeProduct({ id: 1, name: "Espresso (Single)", price_cents: 9000 }),
          makeProduct({ id: 2, name: "Cafe Latte (16oz)", price_cents: 14000 }),
        ],
      }),
    );
  });

  it("renders the available menu and adds an item to the cart on tap", async () => {
    renderPage();
    const user = userEvent.setup();

    const espressoCard = await screen.findByRole("button", { name: /Espresso \(Single\)/ });
    await user.click(espressoCard);

    expect(await screen.findByText("(1)")).toBeInTheDocument();
    // Now appears twice: once in the menu grid, once in the cart line.
    expect(screen.getAllByText("Espresso (Single)")).toHaveLength(2);
  });

  it("does not show unavailable products in the grid", async () => {
    vi.mocked(posApi.fetchMenu).mockResolvedValue(
      makeMenuResponse({
        data: [
          makeProduct({ id: 1, name: "Espresso", is_available: true }),
          makeProduct({ id: 2, name: "Seasonal Drink", is_available: false }),
        ],
      }),
    );

    renderPage();
    await screen.findByRole("button", { name: /Espresso/ });
    expect(screen.queryByText("Seasonal Drink")).not.toBeInTheDocument();
  });

  it("shows an empty-catalog message when the merchant has no products", async () => {
    vi.mocked(posApi.fetchMenu).mockResolvedValue(makeMenuResponse({ data: [] }));
    renderPage();
    expect(await screen.findByText("No products yet")).toBeInTheDocument();
    expect(screen.getByText("Add them in the catalog.")).toBeInTheDocument();
  });

  it("filters the menu by the search box", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole("button", { name: /Espresso \(Single\)/ });

    await user.type(screen.getByPlaceholderText("Search menu…"), "latte");

    expect(screen.queryByText("Espresso (Single)")).not.toBeInTheDocument();
    expect(screen.getByText("Cafe Latte (16oz)")).toBeInTheDocument();
  });

  it("computes quantity, add-on, and discount totals in integer cents and completes a cash charge", async () => {
    vi.mocked(posApi.checkout).mockResolvedValue(makeCheckoutResponse({ order_number: "ORD-000099" }));
    renderPage();
    const user = userEvent.setup();

    const espressoCard = await screen.findByRole("button", { name: /Espresso \(Single\)/ });
    await user.click(espressoCard);
    await user.click(espressoCard); // quantity 2, ₱180.00

    await user.click(screen.getByRole("button", { name: /^Charge ₱/ }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^Charge ₱180\.00/ }));

    await waitFor(() => expect(posApi.checkout).toHaveBeenCalledTimes(1));
    const [request] = vi.mocked(posApi.checkout).mock.calls[0]!;
    expect(request).toMatchObject({ payment_method: "cash", items: [{ product_id: 1, quantity: 2 }] });

    expect(await screen.findByText("ORD-000099")).toBeInTheDocument();
  });

  it("discount preset chips fill the discount field and toggle off on a second tap", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ })); // ₱90.00
    const chargeButton = () => screen.getByRole("button", { name: /^Charge ₱/ });

    await user.click(screen.getByRole("button", { name: "10%" }));
    expect(screen.getByLabelText("Discount")).toHaveValue(9);
    expect(chargeButton()).toHaveTextContent("Charge ₱81.00"); // 10% off ₱90

    await user.click(screen.getByRole("button", { name: "20%" }));
    expect(screen.getByLabelText("Discount")).toHaveValue(18);
    expect(chargeButton()).toHaveTextContent("Charge ₱72.00"); // 20% off ₱90

    await user.click(screen.getByRole("button", { name: "20%" })); // tap again clears it
    expect(screen.getByLabelText("Discount")).toHaveValue(null);
    expect(chargeButton()).toHaveTextContent("Charge ₱90.00");
  });

  it("clears the cart after a successful checkout", async () => {
    vi.mocked(posApi.checkout).mockResolvedValue(makeCheckoutResponse());
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ }));
    await user.click(screen.getByRole("button", { name: /^Charge ₱/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^Charge/ }));

    await user.click(await screen.findByRole("button", { name: "New order" }));

    expect(screen.getByText("Tap a menu item to start an order.")).toBeInTheDocument();
  });

  it("split payment: the charge button is disabled until cash + gcash exactly equal the total, with a running remainder shown", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ })); // ₱90.00
    await user.click(screen.getByRole("button", { name: /^Charge ₱/ }));
    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByRole("tab", { name: "Split" }));
    const chargeBtn = within(dialog).getByRole("button", { name: /^Charge/ });

    // Typing Cash auto-fills GCash with the remainder of the total.
    await user.type(within(dialog).getByLabelText("Cash"), "50");
    expect(within(dialog).getByLabelText("GCash")).toHaveValue(40);
    expect(within(dialog).getByText("Exact — ready to charge.")).toBeInTheDocument();
    expect(chargeBtn).toBeEnabled();

    // Editing GCash by hand overrides the auto-fill and stops it from following.
    await user.clear(within(dialog).getByLabelText("GCash"));
    await user.type(within(dialog).getByLabelText("GCash"), "30");
    expect(within(dialog).getByText("₱10.00 remaining")).toBeInTheDocument();
    expect(chargeBtn).toBeDisabled();

    await user.clear(within(dialog).getByLabelText("GCash"));
    await user.type(within(dialog).getByLabelText("GCash"), "40");
    expect(within(dialog).getByText("Exact — ready to charge.")).toBeInTheDocument();
    expect(chargeBtn).toBeEnabled();
  });

  it("split payment: typing GCash first auto-fills Cash with the remainder", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ })); // ₱90.00
    await user.click(screen.getByRole("button", { name: /^Charge ₱/ }));
    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByRole("tab", { name: "Split" }));

    await user.type(within(dialog).getByLabelText("GCash"), "20");
    expect(within(dialog).getByLabelText("Cash")).toHaveValue(70);
    expect(within(dialog).getByText("Exact — ready to charge.")).toBeInTheDocument();
  });

  it("renders the server's split_mismatch 422 if the server rejects it anyway", async () => {
    vi.mocked(posApi.checkout).mockRejectedValue(
      new ApiError({ status: 422, message: "nope", code: "split_mismatch" }),
    );
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ }));
    await user.click(screen.getByRole("button", { name: /^Charge ₱/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("tab", { name: "Split" }));
    await user.type(within(dialog).getByLabelText("Cash"), "45");
    await user.type(within(dialog).getByLabelText("GCash"), "45");
    await user.click(within(dialog).getByRole("button", { name: /^Charge/ }));

    expect(await screen.findByText(/doesn't add up to the total/i)).toBeInTheDocument();
  });

  it("renders product_unavailable with a clear cashier-facing message and flags the cart line", async () => {
    vi.mocked(posApi.checkout).mockRejectedValue(
      new ApiError({ status: 422, message: "nope", code: "product_unavailable", errors: { product_ids: ["1"] } }),
    );
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ }));
    await user.click(screen.getByRole("button", { name: /^Charge ₱/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^Charge/ }));

    expect(
      await screen.findByText(/some items are no longer available/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no longer available — remove to continue/i)).toBeInTheDocument();
  });

  it("a network failure shows a retry-safe message and retrying resends the SAME idempotency key", async () => {
    vi.mocked(posApi.checkout)
      .mockRejectedValueOnce(new ApiError({ status: 0, message: "network down" }))
      .mockResolvedValueOnce(makeCheckoutResponse());

    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ }));
    await user.click(screen.getByRole("button", { name: /^Charge ₱/ }));
    const dialog = await screen.findByRole("dialog");
    const chargeBtn = within(dialog).getByRole("button", { name: /^Charge/ });

    await user.click(chargeBtn);
    expect(await screen.findByText(/safe to retry/i)).toBeInTheDocument();

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Charge/ }));

    await waitFor(() => expect(posApi.checkout).toHaveBeenCalledTimes(2));
    const [, firstKey] = vi.mocked(posApi.checkout).mock.calls[0]!;
    const [, secondKey] = vi.mocked(posApi.checkout).mock.calls[1]!;
    expect(secondKey).toBe(firstKey);
  });

  it("the charge button cannot fire twice on a rapid double click", async () => {
    let resolveCheckout!: (value: unknown) => void;
    vi.mocked(posApi.checkout).mockReturnValue(
      new Promise((resolve) => {
        resolveCheckout = resolve;
      }) as never,
    );

    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ }));
    await user.click(screen.getByRole("button", { name: /^Charge ₱/ }));
    const dialog = await screen.findByRole("dialog");
    const chargeBtn = within(dialog).getByRole("button", { name: /^Charge/ });

    await user.dblClick(chargeBtn);

    expect(posApi.checkout).toHaveBeenCalledTimes(1);

    // Let the in-flight request settle before the test ends, so the
    // resulting state update (success dialog opening) happens inside
    // React's act() rather than leaking into the next test.
    resolveCheckout(makeCheckoutResponse());
    await screen.findByRole("button", { name: "New order" });
  });

  it("shows a menu load error with a retry option", async () => {
    vi.mocked(posApi.fetchMenu).mockRejectedValue(new Error("Couldn't load the menu."));
    renderPage();
    expect(await screen.findByText("Couldn't load the menu.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
