import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { AddProductDialog } from "./add-product-dialog";
import * as productsApi from "../api";
import { ApiError } from "@/lib/api/client";
import { makeProduct } from "../test-fixtures";

vi.mock("../api", () => ({
  createProduct: vi.fn(),
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

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AddProductDialog />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidateSpy };
}

async function openDialog(user: User) {
  await user.click(screen.getByRole("button", { name: /add product/i }));
  return await screen.findByRole("dialog");
}

/** Picks a category once the list has loaded (the trigger is disabled until then). */
async function chooseCategory(user: User, dialog: HTMLElement, name: string) {
  const trigger = within(dialog).getByLabelText("Category");
  await waitFor(() => expect(trigger).toBeEnabled());
  await user.click(trigger);
  await user.click(await screen.findByRole("option", { name }));
}

/** First argument only: TanStack Query passes a mutation context as the second. */
function sentPayload() {
  return vi.mocked(productsApi.createProduct).mock.calls[0]?.[0];
}

describe("AddProductDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productsApi.fetchCategories).mockResolvedValue(CATEGORIES);
  });

  it("opens the form with no ID or recipe field, fetching categories only once opened", async () => {
    renderDialog();
    const user = userEvent.setup();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(productsApi.fetchCategories).not.toHaveBeenCalled();

    const dialog = await openDialog(user);

    expect(within(dialog).getByRole("heading", { name: "Add product" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Name")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Category")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Price (₱)")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("SKU")).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/recipe/i)).not.toBeInTheDocument();
    await waitFor(() => expect(productsApi.fetchCategories).toHaveBeenCalledTimes(1));
  });

  it("lists the categories from the API and previews the ID prefix for the chosen one", async () => {
    renderDialog();
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    expect(
      within(dialog).getByText("The product ID is assigned automatically from the category."),
    ).toBeInTheDocument();

    await chooseCategory(user, dialog, "Snacks");

    expect(
      within(dialog).getByText("The product ID is assigned automatically: SNK-###."),
    ).toBeInTheDocument();
  });

  it("validates name, category and price client-side without calling the API", async () => {
    renderDialog();
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText("Price (₱)"), "abc");
    await user.click(within(dialog).getByRole("button", { name: "Add product" }));

    expect(await within(dialog).findByText("Name is required.")).toBeInTheDocument();
    expect(within(dialog).getByText("Choose a category.")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter a price like 150 or 150.50.")).toBeInTheDocument();
    expect(productsApi.createProduct).not.toHaveBeenCalled();
  });

  it("submits the category and pesos as integer cents, then closes, toasts and refreshes", async () => {
    vi.mocked(productsApi.createProduct).mockResolvedValue(
      makeProduct({ id: 42, code: "DRK-005", name: "Iced Latte", price_cents: 15050 }),
    );
    const { invalidateSpy } = renderDialog();
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText("Name"), "Iced Latte");
    await chooseCategory(user, dialog, "Drinks");
    await user.type(within(dialog).getByLabelText("Price (₱)"), "150.50");
    await user.click(within(dialog).getByRole("button", { name: "Add product" }));

    await waitFor(() => expect(productsApi.createProduct).toHaveBeenCalledTimes(1));
    expect(sentPayload()).toEqual({
      name: "Iced Latte",
      category: "Drinks",
      price_cents: 15050,
      status: "active",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith("Product added", { description: "Iced Latte" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products", "list"] });
  });

  it("places a 422 from the API under its field and keeps the dialog open", async () => {
    vi.mocked(productsApi.createProduct).mockRejectedValue(
      new ApiError({
        status: 422,
        message: "The given data was invalid.",
        code: "validation_failed",
        errors: { category: ["The selected category is invalid."] },
      }),
    );
    renderDialog();
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText("Name"), "Iced Latte");
    await chooseCategory(user, dialog, "Drinks");
    await user.type(within(dialog).getByLabelText("Price (₱)"), "150");
    await user.click(within(dialog).getByRole("button", { name: "Add product" }));

    expect(
      await within(dialog).findByText("The selected category is invalid."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("shows a form-level alert for a non-validation failure", async () => {
    vi.mocked(productsApi.createProduct).mockRejectedValue(
      new ApiError({ status: 500, message: "Server error." }),
    );
    renderDialog();
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText("Name"), "Iced Latte");
    await chooseCategory(user, dialog, "Drinks");
    await user.type(within(dialog).getByLabelText("Price (₱)"), "150");
    await user.click(within(dialog).getByRole("button", { name: "Add product" }));

    expect(await within(dialog).findByText("Server error.")).toBeInTheDocument();
  });

  it("offers a retry when the category list fails to load", async () => {
    vi.mocked(productsApi.fetchCategories)
      .mockRejectedValueOnce(new ApiError({ status: 500, message: "Server error." }))
      .mockResolvedValueOnce(CATEGORIES);
    renderDialog();
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    await user.click(
      await within(dialog).findByRole("button", { name: "Retry loading categories" }),
    );

    await waitFor(() => expect(within(dialog).getByLabelText("Category")).toBeEnabled());
    expect(productsApi.fetchCategories).toHaveBeenCalledTimes(2);
  });

  it("resets the form when cancelled and reopened", async () => {
    renderDialog();
    const user = userEvent.setup();
    let dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText("Name"), "Draft");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    dialog = await openDialog(user);
    expect(within(dialog).getByLabelText("Name")).toHaveValue("");
  });
});
