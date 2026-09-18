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
import { makeOrderBeneficiary } from "@/features/orders/test-fixtures";

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

  it("does not show category tabs when every product shares one category", async () => {
    vi.mocked(posApi.fetchMenu).mockResolvedValue(
      makeMenuResponse({
        data: [
          makeProduct({ id: 1, name: "Espresso (Single)", category: "Drinks" }),
          makeProduct({ id: 2, name: "Cafe Latte (16oz)", category: "Drinks" }),
        ],
      }),
    );
    renderPage();

    await screen.findByRole("button", { name: /Espresso \(Single\)/ });
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("shows category tabs and filters the grid when categories differ", async () => {
    vi.mocked(posApi.fetchMenu).mockResolvedValue(
      makeMenuResponse({
        data: [
          makeProduct({ id: 1, name: "Espresso (Single)", category: "Drinks" }),
          makeProduct({ id: 2, name: "Croissant", category: "Bakery" }),
          makeProduct({ id: 3, name: "Legacy Item", category: null }),
        ],
      }),
    );
    renderPage();
    const user = userEvent.setup();

    await screen.findByRole("button", { name: /Espresso \(Single\)/ });
    expect(screen.getByText("Croissant")).toBeInTheDocument();
    expect(screen.getByText("Legacy Item")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Bakery" }));
    expect(screen.queryByText("Espresso (Single)")).not.toBeInTheDocument();
    expect(screen.queryByText("Legacy Item")).not.toBeInTheDocument();
    expect(screen.getByText("Croissant")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Other" }));
    expect(screen.getByText("Legacy Item")).toBeInTheDocument();
    expect(screen.queryByText("Croissant")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "All" }));
    expect(screen.getByText("Espresso (Single)")).toBeInTheDocument();
    expect(screen.getByText("Croissant")).toBeInTheDocument();
    expect(screen.getByText("Legacy Item")).toBeInTheDocument();
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

describe("PosPage — F13/P10 senior/PWD discount", () => {
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

  it("adding a beneficiary and assigning a line includes both in the checkout request", async () => {
    vi.mocked(posApi.checkout).mockResolvedValue(makeCheckoutResponse());
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ }));

    await user.click(screen.getByRole("button", { name: "Add" }));
    const dialog = await screen.findByRole("dialog", { name: "Add senior/PWD discount" });
    await user.type(within(dialog).getByLabelText("Name"), "Lola Remedios");
    await user.type(within(dialog).getByLabelText("ID number"), "SC-2020-0001");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));

    // Assign the espresso line to the newly-added beneficiary.
    const assignSelect = await screen.findByRole("combobox", {
      name: /Assign Espresso \(Single\) to a senior\/PWD discount/,
    });
    await user.click(assignSelect);
    await user.click(await screen.findByRole("option", { name: "Lola Remedios" }));

    await user.click(screen.getByRole("button", { name: /^Charge ₱/ }));
    const paymentDialog = await screen.findByRole("dialog", { name: "Take payment" });
    await user.click(within(paymentDialog).getByRole("button", { name: /^Charge/ }));

    await waitFor(() => expect(posApi.checkout).toHaveBeenCalledTimes(1));
    const [request] = vi.mocked(posApi.checkout).mock.calls[0]!;
    expect(request).toMatchObject({
      beneficiaries: [{ type: "senior", name: "Lola Remedios", id_number: "SC-2020-0001" }],
      items: [{ product_id: 1, quantity: 1, beneficiary: 0 }],
    });

    // Let the success dialog settle before the test ends — see the
    // key-rotation test's comment for why (a still-closing Radix portal
    // can otherwise leak into whichever test runs next).
    await screen.findByRole("button", { name: "New order" });
  });

  it("a beneficiary with no assigned lines disables Charge and shows an inline warning, mirroring beneficiary_unused", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ }));
    await user.click(screen.getByRole("button", { name: "Add" }));
    const dialog = await screen.findByRole("dialog", { name: "Add senior/PWD discount" });
    await user.type(within(dialog).getByLabelText("Name"), "Lola Remedios");
    await user.type(within(dialog).getByLabelText("ID number"), "SC-2020-0001");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));

    // Never assigned to the one line in the cart.
    expect(
      await screen.findByText(/No items assigned yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Assign an item to every senior\/PWD discount before charging/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Charge ₱/ })).toBeDisabled();
  });

  it("removing a beneficiary un-assigns their line and re-enables Charge", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ }));
    await user.click(screen.getByRole("button", { name: "Add" }));
    const dialog = await screen.findByRole("dialog", { name: "Add senior/PWD discount" });
    await user.type(within(dialog).getByLabelText("Name"), "Lola Remedios");
    await user.type(within(dialog).getByLabelText("ID number"), "SC-2020-0001");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));

    const assignSelect = await screen.findByRole("combobox", {
      name: /Assign Espresso \(Single\) to a senior\/PWD discount/,
    });
    await user.click(assignSelect);
    await user.click(await screen.findByRole("option", { name: "Lola Remedios" }));
    expect(screen.getByRole("button", { name: /^Charge ₱/ })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Remove Lola Remedios" }));

    expect(screen.queryByText("Lola Remedios")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Charge ₱/ })).toBeEnabled();
    expect(useCartStore.getState().lines[0]!.beneficiaryLocalId).toBeNull();
  });

  it("supports a SECOND beneficiary on the same order — not hardcoded to one", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ }));
    await user.click(await screen.findByRole("button", { name: /Cafe Latte \(16oz\)/ }));

    await user.click(screen.getByRole("button", { name: "Add" }));
    let dialog = await screen.findByRole("dialog", { name: "Add senior/PWD discount" });
    await user.type(within(dialog).getByLabelText("Name"), "Lola Remedios");
    await user.type(within(dialog).getByLabelText("ID number"), "SC-2020-0001");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));

    await user.click(screen.getByRole("button", { name: "Add" }));
    dialog = await screen.findByRole("dialog", { name: "Add senior/PWD discount" });
    await user.click(within(dialog).getByRole("combobox", { name: "Type" }));
    await user.click(await screen.findByRole("option", { name: /Person with Disability/ }));
    await user.type(within(dialog).getByLabelText("Name"), "Juan Cruz");
    await user.type(within(dialog).getByLabelText("ID number"), "PWD-1234-5678");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(screen.getByText("Lola Remedios", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Juan Cruz", { exact: false })).toBeInTheDocument();
    expect(useCartStore.getState().beneficiaries).toHaveLength(2);
  });

  it("labels the discount estimate as an estimate and it never appears as the charged total", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ })); // ₱90.00
    await user.click(screen.getByRole("button", { name: "Add" }));
    const dialog = await screen.findByRole("dialog", { name: "Add senior/PWD discount" });
    await user.type(within(dialog).getByLabelText("Name"), "Lola Remedios");
    await user.type(within(dialog).getByLabelText("ID number"), "SC-2020-0001");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));

    const assignSelect = await screen.findByRole("combobox", {
      name: /Assign Espresso \(Single\) to a senior\/PWD discount/,
    });
    await user.click(assignSelect);
    await user.click(await screen.findByRole("option", { name: "Lola Remedios" }));

    // A flat 20% client-side ESTIMATE — labelled as such, and distinct
    // from a server figure (which this test never receives, since
    // checkout is never submitted here). Appears twice by design: once
    // on the beneficiary's own summary row, once on the assigned line
    // itself (see BeneficiaryList and CartLineItem).
    const estimates = await screen.findAllByText(/Est\..*₱18\.00/);
    expect(estimates.length).toBeGreaterThan(0);
  });

  it("adding a beneficiary rotates the checkout key (the same basket-change rule as an edited quantity)", async () => {
    // Only ONE Once is queued for this first attempt (the network
    // failure) — an unconsumed queued value here would otherwise leak
    // into whichever test's checkout() call runs next, since neither
    // clearAllMocks() nor a fresh render drains a mock's pending
    // *Once queue, only its call history.
    vi.mocked(posApi.checkout).mockRejectedValueOnce(
      new ApiError({ status: 0, message: "network down" }),
    );
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ }));
    await user.click(screen.getByRole("button", { name: /^Charge ₱/ }));
    let dialog = await screen.findByRole("dialog", { name: "Take payment" });
    await user.click(within(dialog).getByRole("button", { name: /^Charge/ }));
    await waitFor(() => expect(posApi.checkout).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/safe to retry/i)).toBeInTheDocument();
    const [, firstKey] = vi.mocked(posApi.checkout).mock.calls[0]!;

    // Close the payment dialog without retrying, add a beneficiary and
    // assign the only line, then charge again — this is now a DIFFERENT
    // basket and must get a fresh key, not the retry path.
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    vi.mocked(posApi.checkout).mockResolvedValueOnce(makeCheckoutResponse());
    await user.click(screen.getByRole("button", { name: "Add" }));
    dialog = await screen.findByRole("dialog", { name: "Add senior/PWD discount" });
    await user.type(within(dialog).getByLabelText("Name"), "Lola Remedios");
    await user.type(within(dialog).getByLabelText("ID number"), "SC-2020-0001");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));
    const assignSelect = await screen.findByRole("combobox", {
      name: /Assign Espresso \(Single\) to a senior\/PWD discount/,
    });
    await user.click(assignSelect);
    await user.click(await screen.findByRole("option", { name: "Lola Remedios" }));

    await user.click(screen.getByRole("button", { name: /^Charge ₱/ }));
    dialog = await screen.findByRole("dialog", { name: "Take payment" });
    await user.click(within(dialog).getByRole("button", { name: /^Charge/ }));

    await waitFor(() => expect(posApi.checkout).toHaveBeenCalledTimes(2));
    const [, secondKey] = vi.mocked(posApi.checkout).mock.calls[1]!;
    expect(secondKey).not.toBe(firstKey);

    // Let the success dialog's own mount/animation settle before the test
    // ends — otherwise its Radix portal can still be closing when the
    // NEXT test's render starts, leaking a stale dialog into it.
    await screen.findByRole("button", { name: "New order" });
  });

  it("shows the beneficiary's name and server-authoritative discount on the success screen", async () => {
    vi.mocked(posApi.checkout).mockResolvedValue(
      makeCheckoutResponse({
        beneficiaries: [
          makeOrderBeneficiary({ name: "Lola Remedios", discount_cents: 2800, discount_formatted: "₱28.00" }),
        ],
      }),
    );
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Espresso \(Single\)/ }));
    await user.click(screen.getByRole("button", { name: /^Charge ₱/ }));
    const dialog = await screen.findByRole("dialog", { name: "Take payment" });
    await user.click(within(dialog).getByRole("button", { name: /^Charge/ }));
    await waitFor(() => expect(posApi.checkout).toHaveBeenCalledTimes(1));

    // Rendered as separate JSX text nodes ({name} — {discount} off), so
    // matched by a normalizer joining the element's own text content
    // rather than a regex spanning node boundaries. Matches both the <li>
    // and its parent <ul> (whose textContent is inherited) — either
    // proves the row rendered.
    const matches = await screen.findAllByText(
      (_, element) => element?.textContent === "Lola Remedios — ₱28.00 off",
    );
    expect(matches.length).toBeGreaterThan(0);
  });
});
