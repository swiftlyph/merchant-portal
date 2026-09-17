import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProductsPage } from "./products-page";
import * as productsApi from "../api";
import { ApiError } from "@/lib/api/client";
import { makeProduct, makeProductsPage, makeRecipeItem } from "../test-fixtures";

vi.mock("../api", () => ({
  fetchProducts: vi.fn(),
  fetchProduct: vi.fn(),
  fetchCategories: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  updateProductRecipe: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderProductsPage(initialEntry = "/app/products") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/app/products" element={<ProductsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProductsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders product rows with price, product ID, status and recipe", async () => {
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(
      makeProductsPage({
        data: [
          makeProduct({ id: 1, name: "Iced Latte", code: "DRK-001", price_cents: 15000 }),
          makeProduct({
            id: 2,
            name: "Croissant",
            code: "BKY-001",
            price_cents: 8500,
            status: "inactive",
            recipe: [makeRecipeItem()],
            in_stock: false,
          }),
        ],
      }),
    );

    renderProductsPage();

    expect(await screen.findByText("Iced Latte")).toBeInTheDocument();
    expect(screen.getByText("Croissant")).toBeInTheDocument();
    expect(screen.getByText("DRK-001")).toBeInTheDocument();
    expect(screen.getByText("₱150.00")).toBeInTheDocument();
    expect(screen.getByText("₱85.00")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getByText("1 ingredient · out of stock")).toBeInTheDocument();
  });

  it("shows a loading skeleton before data arrives", () => {
    vi.mocked(productsApi.fetchProducts).mockReturnValue(new Promise(() => {}));

    renderProductsPage();

    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("shows an empty state when there are no products", async () => {
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(makeProductsPage({ data: [] }));

    renderProductsPage();

    expect(await screen.findByText("No products found")).toBeInTheDocument();
  });

  it("shows an error state with a retry button that refetches", async () => {
    vi.mocked(productsApi.fetchProducts)
      .mockRejectedValueOnce(new ApiError({ status: 500, message: "Server error." }))
      .mockResolvedValueOnce(makeProductsPage({ data: [makeProduct()] }));

    renderProductsPage();

    expect(await screen.findByText("Server error.")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Iced Latte")).toBeInTheDocument();
    expect(productsApi.fetchProducts).toHaveBeenCalledTimes(2);
  });

  it("initializes filters from the URL and calls the API with them", async () => {
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(makeProductsPage());

    renderProductsPage("/app/products?status=inactive&page=2");

    await waitFor(() =>
      expect(productsApi.fetchProducts).toHaveBeenCalledWith({
        status: "inactive",
        page: 2,
        perPage: 15,
      }),
    );
  });

  it("changing the status filter updates the URL and refetches", async () => {
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(makeProductsPage());
    renderProductsPage();
    const user = userEvent.setup();

    await screen.findByRole("combobox");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Inactive" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/app/products?status=inactive"),
    );
    await waitFor(() =>
      expect(productsApi.fetchProducts).toHaveBeenLastCalledWith({
        status: "inactive",
        page: 1,
        perPage: 15,
      }),
    );
  });

  it("filters loaded rows by name or product ID via the search box, client-side", async () => {
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(
      makeProductsPage({
        data: [
          makeProduct({ id: 1, name: "Iced Latte", code: "DRK-001" }),
          makeProduct({ id: 2, name: "Croissant", code: "BKY-001" }),
        ],
      }),
    );
    renderProductsPage();
    const user = userEvent.setup();

    await screen.findByText("Iced Latte");
    await user.type(screen.getByLabelText("Search"), "bky");

    expect(screen.queryByText("Iced Latte")).not.toBeInTheDocument();
    expect(screen.getByText("Croissant")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("q=bky"));
    for (const call of vi.mocked(productsApi.fetchProducts).mock.calls) {
      expect(call[0]).not.toHaveProperty("q");
    }
  });

  it("clear filters resets status and search", async () => {
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(
      makeProductsPage({ data: [makeProduct({ name: "Iced Latte" })] }),
    );
    renderProductsPage("/app/products?status=inactive&q=nope");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Clear filters" }));

    expect(screen.getByLabelText("Search")).toHaveValue("");
    expect(await screen.findByText("Iced Latte")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("location")).not.toHaveTextContent("status="),
    );
  });

  it("each row has a view icon that opens a read-only detail modal with the recipe, refreshed from the API", async () => {
    const row = makeProduct({
      id: 2,
      name: "Croissant",
      code: "BKY-001",
      category: "Bakery",
      price_cents: 8500,
      recipe: [makeRecipeItem({ ingredient_name: "Croissant Dough", quantity: 1, unit: "pcs" })],
    });
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(makeProductsPage({ data: [row] }));
    // The refetch brings back a description and a now-depleted recipe.
    vi.mocked(productsApi.fetchProduct).mockResolvedValue({
      ...row,
      description: "Butter, laminated.",
      in_stock: false,
      recipe: [
        makeRecipeItem({
          ingredient_name: "Croissant Dough",
          quantity: 1,
          unit: "pcs",
          ingredient_stock_status: "out_of_stock",
        }),
      ],
    });
    renderProductsPage();
    const user = userEvent.setup();

    await screen.findByText("Croissant");
    await user.click(screen.getByRole("button", { name: "View Croissant" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /Croissant/ })).toBeInTheDocument();
    expect(within(dialog).getByText("₱85.00")).toBeInTheDocument();
    expect(within(dialog).getByText("BKY-001 · Bakery")).toBeInTheDocument();

    // Refreshed values replace the row's once the show request resolves.
    expect(await within(dialog).findByText("Butter, laminated.")).toBeInTheDocument();
    expect(within(dialog).getByText("Croissant Dough — 1 pcs")).toBeInTheDocument();
    // "Out of stock" appears twice — the recipe section's own summary
    // badge and this line's ingredient badge — both correctly reflecting
    // the depleted refetch.
    expect(within(dialog).getAllByText("Out of stock")).toHaveLength(2);
    expect(productsApi.fetchProduct).toHaveBeenCalledWith(2);

    // Two "Close" buttons: the dialog's built-in X and the footer button. Use the footer one.
    const closeButtons = within(dialog).getAllByRole("button", { name: "Close" });
    await user.click(closeButtons[closeButtons.length - 1]!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("the view modal says so when the product was deleted elsewhere", async () => {
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(
      makeProductsPage({ data: [makeProduct({ id: 9, name: "Gone Soon" })] }),
    );
    vi.mocked(productsApi.fetchProduct).mockRejectedValue(
      new ApiError({ status: 404, message: "Resource not found.", code: "not_found" }),
    );
    renderProductsPage();
    const user = userEvent.setup();

    await screen.findByText("Gone Soon");
    await user.click(screen.getByRole("button", { name: "View Gone Soon" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText(/no longer exists/)).toBeInTheDocument();
    // Still shows what it had rather than an empty modal.
    expect(within(dialog).getByRole("heading", { name: /Gone Soon/ })).toBeInTheDocument();
  });

  it("each row has an edit icon that opens a form pre-filled with the row's values", async () => {
    vi.mocked(productsApi.fetchCategories).mockResolvedValue([
      { name: "Drinks", prefix: "DRK" },
      { name: "Bakery", prefix: "BKY" },
    ]);
    const row = makeProduct({ id: 3, name: "Matcha Latte", category: "Drinks", price_cents: 16500 });
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(makeProductsPage({ data: [row] }));
    vi.mocked(productsApi.updateProduct).mockResolvedValue({ ...row, name: "Matcha Latte Deluxe" });
    renderProductsPage();
    const user = userEvent.setup();

    await screen.findByText("Matcha Latte");
    await user.click(screen.getByRole("button", { name: "Edit Matcha Latte" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Edit product" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Matcha Latte");
    expect(within(dialog).getByLabelText("Price (₱)")).toHaveValue("165");

    const name = within(dialog).getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Matcha Latte Deluxe");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(productsApi.updateProduct).toHaveBeenCalledWith(3, expect.objectContaining({ name: "Matcha Latte Deluxe" })));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // The list refetches after a save.
    await waitFor(() => expect(productsApi.fetchProducts).toHaveBeenCalledTimes(2));
  });

  it("the view modal's Edit button opens the edit form with the freshest fetched data and closes the view", async () => {
    vi.mocked(productsApi.fetchCategories).mockResolvedValue([
      { name: "Drinks", prefix: "DRK" },
      { name: "Bakery", prefix: "BKY" },
    ]);
    const row = makeProduct({ id: 4, name: "Bagel", category: "Bakery", price_cents: 7000 });
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(makeProductsPage({ data: [row] }));
    // The show request refreshes a newer price than the row had — Edit
    // should open with THIS value, not the stale row's. Rebuilt through
    // makeProduct (not spread from `row`) so price_formatted is recomputed
    // for the new price_cents rather than carrying the old row's string.
    vi.mocked(productsApi.fetchProduct).mockResolvedValue(
      makeProduct({ id: 4, name: "Bagel", category: "Bakery", price_cents: 7500 }),
    );
    renderProductsPage();
    const user = userEvent.setup();

    await screen.findByText("Bagel");
    await user.click(screen.getByRole("button", { name: "View Bagel" }));

    const viewDialog = await screen.findByRole("dialog");
    await within(viewDialog).findByText("₱75.00");
    await user.click(within(viewDialog).getByRole("button", { name: "Edit" }));

    // The view dialog is gone, replaced by the edit dialog.
    await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1));
    const editDialog = screen.getByRole("dialog");
    expect(within(editDialog).getByRole("heading", { name: "Edit product" })).toBeInTheDocument();
    expect(within(editDialog).getByLabelText("Price (₱)")).toHaveValue("75");
  });

  it("each row has a chef-hat recipe icon, separate from the pencil edit icon", async () => {
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(
      makeProductsPage({ data: [makeProduct({ id: 5, name: "Matcha Latte" })] }),
    );
    renderProductsPage();

    await screen.findByText("Matcha Latte");
    expect(screen.getByRole("button", { name: "Edit recipe for Matcha Latte" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Matcha Latte" })).toBeInTheDocument();
  });

  it("each row has a delete icon button that confirms before calling the API", async () => {
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(
      makeProductsPage({
        data: [
          makeProduct({ id: 1, name: "Iced Latte" }),
          makeProduct({ id: 2, name: "Croissant", recipe: [makeRecipeItem()] }),
        ],
      }),
    );
    vi.mocked(productsApi.deleteProduct).mockResolvedValue(undefined);
    renderProductsPage();
    const user = userEvent.setup();

    await screen.findByText("Croissant");
    await user.click(screen.getByRole("button", { name: "Delete Croissant" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Delete Croissant?")).toBeInTheDocument();
    expect(within(dialog).getByText(/along with its recipe/)).toBeInTheDocument();
    // Nothing is deleted until the destructive action is confirmed.
    expect(productsApi.deleteProduct).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Delete product" }));

    await waitFor(() => expect(productsApi.deleteProduct).toHaveBeenCalledWith(2));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    // The list refetches after a delete.
    await waitFor(() => expect(productsApi.fetchProducts).toHaveBeenCalledTimes(2));
  });

  it("cancelling the delete confirmation leaves the product alone", async () => {
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(
      makeProductsPage({ data: [makeProduct({ id: 1, name: "Iced Latte" })] }),
    );
    renderProductsPage();
    const user = userEvent.setup();

    await screen.findByText("Iced Latte");
    await user.click(screen.getByRole("button", { name: "Delete Iced Latte" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(productsApi.deleteProduct).not.toHaveBeenCalled();
    expect(screen.getByText("Iced Latte")).toBeInTheDocument();
  });

  it("paginates using meta and reflects the page in the URL", async () => {
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(
      makeProductsPage({
        meta: {
          current_page: 1,
          from: 1,
          last_page: 3,
          links: [],
          path: "/api/v1/merchant/products",
          per_page: 10,
          to: 10,
          total: 30,
        },
      }),
    );
    renderProductsPage();
    const user = userEvent.setup();

    expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();
    const nextButton = within(screen.getByRole("navigation")).getByRole("link", {
      name: /go to next page/i,
    });
    await user.click(nextButton);

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("page=2"));
  });

  it("defaults to 15 rows per page, and does not send a per_page filter to the URL for the default", async () => {
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(makeProductsPage());

    renderProductsPage();

    await waitFor(() =>
      expect(productsApi.fetchProducts).toHaveBeenCalledWith(expect.objectContaining({ perPage: 15 })),
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("per_page=");
  });

  it("choosing 25 or 50 rows per page updates the URL, refetches, and resets to page 1", async () => {
    vi.mocked(productsApi.fetchProducts).mockResolvedValue(
      makeProductsPage({
        meta: {
          current_page: 1,
          from: 1,
          last_page: 1,
          links: [],
          path: "/api/v1/merchant/products",
          per_page: 15,
          to: 1,
          total: 1,
        },
      }),
    );
    renderProductsPage("/app/products?page=2");
    const user = userEvent.setup();

    const perPageTrigger = await screen.findByLabelText("Rows per page");
    await user.click(perPageTrigger);
    await user.click(await screen.findByRole("option", { name: "50" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("per_page=50"),
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent(/[?&]page=2\b/);
    await waitFor(() =>
      expect(productsApi.fetchProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ perPage: 50, page: 1 }),
      ),
    );
  });
});
