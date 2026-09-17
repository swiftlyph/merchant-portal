import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { EditRecipeButton } from "./edit-recipe-dialog";
import * as productsApi from "../api";
import * as ingredientsApi from "@/features/ingredients/api";
import { ApiError } from "@/lib/api/client";
import { makeProduct, makeRecipeItem } from "../test-fixtures";
import { makeIngredient, makeIngredientsPage } from "@/features/ingredients/test-fixtures";

vi.mock("../api", () => ({
  updateProductRecipe: vi.fn(),
}));

vi.mock("@/features/ingredients/api", () => ({
  fetchIngredients: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const MATCHA_POWDER = makeIngredient({ id: 1, name: "Matcha Powder", unit_type: "mass", display_unit: "kg", available_units: ["mg", "g", "kg"] });
const MILK = makeIngredient({ id: 2, name: "Milk", unit_type: "volume", display_unit: "l", available_units: ["ml", "l"] });
const CUPS = makeIngredient({ id: 3, name: "Cups (16oz)", unit_type: "count", display_unit: "pcs", available_units: ["pcs"] });

type User = ReturnType<typeof userEvent.setup>;

function renderButton(product = makeProduct({ name: "Matcha Latte" })) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  render(
    <QueryClientProvider client={queryClient}>
      <EditRecipeButton product={product} />
    </QueryClientProvider>,
  );
  return { invalidateSpy };
}

async function openDialog(user: User, name = "Edit recipe for Matcha Latte") {
  await user.click(screen.getByRole("button", { name }));
  return await screen.findByRole("dialog");
}

async function chooseIngredient(user: User, trigger: HTMLElement, name: string) {
  await user.click(trigger);
  await user.click(await screen.findByRole("option", { name }));
}

function sentPayload() {
  return vi.mocked(productsApi.updateProductRecipe).mock.calls[0]?.[1];
}

describe("EditRecipeButton / EditRecipeDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      makeIngredientsPage({ data: [MATCHA_POWDER, MILK, CUPS] }),
    );
  });

  it("pre-fills a row per existing recipe line, with its ingredient, quantity and unit", async () => {
    const product = makeProduct({
      name: "Matcha Latte",
      recipe: [
        makeRecipeItem({ id: 1, ingredient_id: 1, ingredient_name: "Matcha Powder", quantity: 30, unit: "g" }),
        makeRecipeItem({ id: 2, ingredient_id: 2, ingredient_name: "Milk", quantity: 100, unit: "ml" }),
      ],
    });
    renderButton(product);
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    await waitFor(() => expect(ingredientsApi.fetchIngredients).toHaveBeenCalled());

    const quantities = within(dialog).getAllByLabelText("Quantity");
    expect(quantities.map((el) => (el as HTMLInputElement).value)).toEqual(["30", "100"]);
  });

  it("shows an empty state and no rows when the product has no recipe yet", async () => {
    renderButton(makeProduct({ name: "Matcha Latte", recipe: [] }));
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    expect(
      within(dialog).getByText(/this product is always available/i),
    ).toBeInTheDocument();
    expect(within(dialog).queryAllByLabelText("Quantity")).toHaveLength(0);
  });

  it("adding a line lets you pick an ingredient, narrowing the unit dropdown to its own family", async () => {
    renderButton(makeProduct({ name: "Matcha Latte", recipe: [] }));
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    await waitFor(() => expect(within(dialog).getByRole("button", { name: /add ingredient/i })).toBeEnabled());
    await user.click(within(dialog).getByRole("button", { name: /add ingredient/i }));

    await chooseIngredient(user, within(dialog).getByLabelText("Ingredient"), "Matcha Powder");

    await user.click(within(dialog).getByLabelText("Unit"));
    expect(screen.getByRole("option", { name: "mg" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "g" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "ml" })).not.toBeInTheDocument();
  });

  it("an ingredient already used in one row is excluded from another row's dropdown", async () => {
    renderButton(makeProduct({ name: "Matcha Latte", recipe: [] }));
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await waitFor(() => expect(within(dialog).getByRole("button", { name: /add ingredient/i })).toBeEnabled());

    await user.click(within(dialog).getByRole("button", { name: /add ingredient/i }));
    await chooseIngredient(user, within(dialog).getAllByLabelText("Ingredient")[0]!, "Matcha Powder");

    await user.click(within(dialog).getByRole("button", { name: /add ingredient/i }));
    await user.click(within(dialog).getAllByLabelText("Ingredient")[1]!);

    expect(screen.queryByRole("option", { name: "Matcha Powder" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Milk" })).toBeInTheDocument();
  });

  it("removing a line drops it from the form", async () => {
    const product = makeProduct({
      name: "Matcha Latte",
      recipe: [makeRecipeItem({ id: 1, ingredient_id: 1, ingredient_name: "Matcha Powder", quantity: 30, unit: "g" })],
    });
    renderButton(product);
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await waitFor(() => expect(within(dialog).getAllByLabelText("Quantity")).toHaveLength(1));

    await user.click(within(dialog).getByRole("button", { name: "Remove ingredient line" }));

    expect(within(dialog).queryAllByLabelText("Quantity")).toHaveLength(0);
  });

  it("submits the recipe and closes, toasts and refreshes, on a valid save", async () => {
    const product = makeProduct({
      id: 20,
      name: "Matcha Latte",
      recipe: [makeRecipeItem({ id: 1, ingredient_id: 1, ingredient_name: "Matcha Powder", quantity: 30, unit: "g" })],
    });
    vi.mocked(productsApi.updateProductRecipe).mockResolvedValue({ ...product });
    const { invalidateSpy } = renderButton(product);
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await waitFor(() => expect(within(dialog).getAllByLabelText("Quantity")).toHaveLength(1));

    const quantity = within(dialog).getByLabelText("Quantity");
    await user.clear(quantity);
    await user.type(quantity, "40");
    await user.click(within(dialog).getByRole("button", { name: "Save recipe" }));

    await waitFor(() => expect(productsApi.updateProductRecipe).toHaveBeenCalledTimes(1));
    expect(vi.mocked(productsApi.updateProductRecipe).mock.calls[0]?.[0]).toBe(20);
    expect(sentPayload()).toEqual({ ingredients: [{ ingredient_id: 1, quantity: 40, unit: "g" }] });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith("Recipe updated", { description: "Matcha Latte" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products", "list"] });
  });

  it("saving an empty recipe sends an empty ingredients array, clearing it", async () => {
    const product = makeProduct({ id: 21, name: "Matcha Latte", recipe: [] });
    vi.mocked(productsApi.updateProductRecipe).mockResolvedValue(product);
    renderButton(product);
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("button", { name: "Save recipe" }));

    await waitFor(() => expect(productsApi.updateProductRecipe).toHaveBeenCalledTimes(1));
    expect(sentPayload()).toEqual({ ingredients: [] });
  });

  it("a blank added-but-never-filled row is silently dropped, not an error", async () => {
    const product = makeProduct({ id: 22, name: "Matcha Latte", recipe: [] });
    vi.mocked(productsApi.updateProductRecipe).mockResolvedValue(product);
    renderButton(product);
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await waitFor(() => expect(within(dialog).getByRole("button", { name: /add ingredient/i })).toBeEnabled());

    await user.click(within(dialog).getByRole("button", { name: /add ingredient/i }));
    await user.click(within(dialog).getByRole("button", { name: "Save recipe" }));

    await waitFor(() => expect(productsApi.updateProductRecipe).toHaveBeenCalledTimes(1));
    expect(sentPayload()).toEqual({ ingredients: [] });
  });

  it("a filled row missing its quantity is a client-side validation error, without calling the API", async () => {
    renderButton(makeProduct({ name: "Matcha Latte", recipe: [] }));
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await waitFor(() => expect(within(dialog).getByRole("button", { name: /add ingredient/i })).toBeEnabled());

    await user.click(within(dialog).getByRole("button", { name: /add ingredient/i }));
    await chooseIngredient(user, within(dialog).getByLabelText("Ingredient"), "Matcha Powder");
    await user.clear(within(dialog).getByLabelText("Quantity"));
    await user.click(within(dialog).getByRole("button", { name: "Save recipe" }));

    expect(await within(dialog).findByText("Enter a whole number greater than 0.")).toBeInTheDocument();
    expect(productsApi.updateProductRecipe).not.toHaveBeenCalled();
  });

  it("maps a per-line 422 from the API back onto the row it belongs to", async () => {
    vi.mocked(productsApi.updateProductRecipe).mockRejectedValue(
      new ApiError({
        status: 422,
        message: "The given data was invalid.",
        code: "validation_failed",
        errors: { "ingredients.0.unit": ["This ingredient is tracked in mass; use one of: mg, g, kg."] },
      }),
    );
    const product = makeProduct({
      name: "Matcha Latte",
      recipe: [makeRecipeItem({ id: 1, ingredient_id: 1, ingredient_name: "Matcha Powder", quantity: 30, unit: "g" })],
    });
    renderButton(product);
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await waitFor(() => expect(within(dialog).getAllByLabelText("Quantity")).toHaveLength(1));

    await user.click(within(dialog).getByRole("button", { name: "Save recipe" }));

    expect(
      await within(dialog).findByText("This ingredient is tracked in mass; use one of: mg, g, kg."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("cancel closes without saving", async () => {
    renderButton(makeProduct({ name: "Matcha Latte", recipe: [] }));
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(productsApi.updateProductRecipe).not.toHaveBeenCalled();
  });
});
