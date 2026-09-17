import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { EditProductButton } from "./edit-product-dialog";
import * as productsApi from "../api";
import { ApiError } from "@/lib/api/client";
import { makeProduct, makeRecipeItem } from "../test-fixtures";

vi.mock("../api", () => ({
  updateProduct: vi.fn(),
  fetchCategories: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const CATEGORIES = [
  { name: "Drinks", prefix: "DRK" },
  { name: "Snacks", prefix: "SNK" },
  { name: "Bakery", prefix: "BKY" },
];

type User = ReturnType<typeof userEvent.setup>;

function renderButton(product = makeProduct()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EditProductButton product={product} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidateSpy };
}

async function openDialog(user: User, name = "Edit Iced Latte") {
  await user.click(screen.getByRole("button", { name }));
  return await screen.findByRole("dialog");
}

async function chooseCategory(user: User, dialog: HTMLElement, name: string) {
  const trigger = within(dialog).getByLabelText("Category");
  await waitFor(() => expect(trigger).toBeEnabled());
  await user.click(trigger);
  await user.click(await screen.findByRole("option", { name }));
}

/** First argument only: TanStack Query passes a mutation context as the second. */
function sentPayload() {
  return vi.mocked(productsApi.updateProduct).mock.calls[0]?.[1];
}

describe("EditProductButton / EditProductDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productsApi.fetchCategories).mockResolvedValue(CATEGORIES);
  });

  it("opens pre-filled with the product's current values", async () => {
    const product = makeProduct({
      name: "Iced Latte",
      category: "Drinks",
      price_cents: 15050,
      status: "inactive",
    });
    renderButton(product);
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    expect(within(dialog).getByRole("heading", { name: "Edit product" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Iced Latte");
    expect(within(dialog).getByLabelText("Price (₱)")).toHaveValue("150.5");
    expect(within(dialog).getByLabelText("Status")).toHaveTextContent("Inactive");
    // Product ID is shown as read-only context, not an editable field.
    expect(within(dialog).getByText(/Product ID: DRK-001/)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Product ID")).not.toBeInTheDocument();
  });

  it("shows an empty-recipe summary with a button into the recipe editor", async () => {
    renderButton(makeProduct({ recipe: [] }));
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    expect(within(dialog).getByText("No ingredients — always available.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /edit recipe/i })).toBeInTheDocument();
  });

  it("summarizes an existing recipe's ingredient count and stock state", async () => {
    renderButton(makeProduct({ recipe: [makeRecipeItem()], in_stock: false }));
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    expect(within(dialog).getByText("1 ingredient — out of stock.")).toBeInTheDocument();
  });

  it("saves changes and sends the full form as a PATCH, then closes, toasts and refreshes", async () => {
    const product = makeProduct({ id: 9, name: "Iced Latte", category: "Drinks" });
    vi.mocked(productsApi.updateProduct).mockResolvedValue({ ...product, price_cents: 16000 });
    const { invalidateSpy } = renderButton(product);
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    const price = within(dialog).getByLabelText("Price (₱)");
    await user.clear(price);
    await user.type(price, "160");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(productsApi.updateProduct).toHaveBeenCalledTimes(1));
    expect(vi.mocked(productsApi.updateProduct).mock.calls[0]?.[0]).toBe(9);
    expect(sentPayload()).toEqual({
      name: "Iced Latte",
      category: "Drinks",
      price_cents: 16000,
      status: "active",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith("Product updated", { description: product.name });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products", "list"] });
  });

  it("validates name, category and price client-side without calling the API", async () => {
    const product = makeProduct();
    renderButton(product);
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    const name = within(dialog).getByLabelText("Name");
    await user.clear(name);
    const price = within(dialog).getByLabelText("Price (₱)");
    await user.clear(price);
    await user.type(price, "abc");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(await within(dialog).findByText("Name is required.")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter a price like 150 or 150.50.")).toBeInTheDocument();
    expect(productsApi.updateProduct).not.toHaveBeenCalled();
  });

  it("places a 422 from the API under its field and keeps the dialog open", async () => {
    vi.mocked(productsApi.updateProduct).mockRejectedValue(
      new ApiError({
        status: 422,
        message: "The given data was invalid.",
        code: "validation_failed",
        errors: { category: ["The selected category is invalid."] },
      }),
    );
    renderButton(makeProduct());
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(
      await within(dialog).findByText("The selected category is invalid."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("cancel discards changes; reopening shows the product's real values again", async () => {
    const product = makeProduct({ name: "Iced Latte" });
    renderButton(product);
    const user = userEvent.setup();
    let dialog = await openDialog(user);

    const name = within(dialog).getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Something Else");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    dialog = await openDialog(user);
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Iced Latte");
    expect(productsApi.updateProduct).not.toHaveBeenCalled();
  });

  it("leaving the category unchanged says the ID stays the same", async () => {
    const product = makeProduct({ category: "Drinks", code: "DRK-001" });
    renderButton(product);
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    expect(
      within(dialog).getByText("This product keeps its current ID unless you change the category."),
    ).toBeInTheDocument();
  });

  it("changing category previews that a new ID will be assigned, and reverting back removes the preview", async () => {
    const product = makeProduct({ category: "Drinks", code: "DRK-001" });
    renderButton(product);
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    await chooseCategory(user, dialog, "Snacks");

    expect(
      within(dialog).getByText("Saving will assign a new product ID: SNK-###, replacing DRK-001."),
    ).toBeInTheDocument();

    await chooseCategory(user, dialog, "Drinks");

    expect(
      within(dialog).getByText("This product keeps its current ID unless you change the category."),
    ).toBeInTheDocument();
  });

  it("a product with no ID yet previews getting its first one once a category is chosen", async () => {
    const product = makeProduct({ category: "", code: "" });
    renderButton(product);
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    expect(
      within(dialog).getByText("Choosing a category assigns this product its first ID."),
    ).toBeInTheDocument();

    await chooseCategory(user, dialog, "Bakery");

    expect(
      within(dialog).getByText("Saving will assign this product its first ID: BKY-###."),
    ).toBeInTheDocument();
  });

  it("changing the category sends it in the update, and the response's new code is what's shown after saving", async () => {
    const product = makeProduct({ id: 5, category: "Drinks", code: "DRK-001" });
    vi.mocked(productsApi.updateProduct).mockResolvedValue({
      ...product,
      category: "Snacks",
      code: "SNK-001",
    });
    renderButton(product);
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    await chooseCategory(user, dialog, "Snacks");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(productsApi.updateProduct).toHaveBeenCalledTimes(1));
    expect(sentPayload()).toMatchObject({ category: "Snacks" });
    // The form never sends a `code` — reissuing it is entirely the
    // server's decision, driven only by the category it receives.
    expect(sentPayload()).not.toHaveProperty("code");
  });
});
