import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IngredientsPage } from "./ingredients-page";
import * as ingredientsApi from "../api";
import { ApiError } from "@/lib/api/client";
import { makeIngredient, makeIngredientsPage } from "../test-fixtures";

vi.mock("../api", () => ({
  fetchIngredients: vi.fn(),
  createIngredient: vi.fn(),
  updateIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderIngredientsPage(initialEntry = "/app/inventory") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/app/inventory" element={<IngredientsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("IngredientsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders ingredient rows with code, quantities and stock status", async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      makeIngredientsPage({
        data: [
          makeIngredient({ id: 1, code: "0001", name: "Matcha Powder", quantity_on_hand_formatted: "5", low_stock_threshold_formatted: "1" }),
          makeIngredient({ id: 2, code: "0002", name: "Milk", stock_status: "low_stock" }),
        ],
      }),
    );

    renderIngredientsPage();

    expect(await screen.findByText("Matcha Powder")).toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("0001")).toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument();
    expect(screen.getByText("Low stock")).toBeInTheDocument();
  });

  it("shows a loading skeleton before data arrives", () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockReturnValue(new Promise(() => {}));

    renderIngredientsPage();

    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("shows an empty state when there are no ingredients", async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(makeIngredientsPage({ data: [] }));

    renderIngredientsPage();

    expect(await screen.findByText("No ingredients found")).toBeInTheDocument();
  });

  it("shows an error state with a retry button that refetches", async () => {
    vi.mocked(ingredientsApi.fetchIngredients)
      .mockRejectedValueOnce(new ApiError({ status: 500, message: "Server error." }))
      .mockResolvedValueOnce(makeIngredientsPage({ data: [makeIngredient()] }));

    renderIngredientsPage();

    expect(await screen.findByText("Server error.")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Matcha Powder")).toBeInTheDocument();
    expect(ingredientsApi.fetchIngredients).toHaveBeenCalledTimes(2);
  });

  it("initializes filters from the URL, defaulting to 15 rows per page", async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(makeIngredientsPage());

    renderIngredientsPage("/app/inventory?status=low_stock&page=2");

    await waitFor(() =>
      expect(ingredientsApi.fetchIngredients).toHaveBeenCalledWith({
        status: "low_stock",
        page: 2,
        perPage: 15,
      }),
    );
  });

  it("changing the stock status filter updates the URL and refetches", async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(makeIngredientsPage());
    renderIngredientsPage();
    const user = userEvent.setup();

    await screen.findByRole("combobox");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Low stock" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/app/inventory?status=low_stock"),
    );
    await waitFor(() =>
      expect(ingredientsApi.fetchIngredients).toHaveBeenLastCalledWith({
        status: "low_stock",
        page: 1,
        perPage: 15,
      }),
    );
  });

  it("filters loaded rows by name or ingredient ID via the search box, client-side", async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      makeIngredientsPage({
        data: [
          makeIngredient({ id: 1, code: "0001", name: "Matcha Powder" }),
          makeIngredient({ id: 2, code: "0002", name: "Milk" }),
        ],
      }),
    );
    renderIngredientsPage();
    const user = userEvent.setup();

    await screen.findByText("Matcha Powder");
    await user.type(screen.getByLabelText("Search"), "milk");

    expect(screen.queryByText("Matcha Powder")).not.toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("q=milk"));
  });

  it("clear filters resets status and search", async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      makeIngredientsPage({ data: [makeIngredient({ name: "Matcha Powder" })] }),
    );
    renderIngredientsPage("/app/inventory?status=low_stock&q=nope");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Clear filters" }));

    expect(screen.getByLabelText("Search")).toHaveValue("");
    expect(await screen.findByText("Matcha Powder")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("location")).not.toHaveTextContent("status="));
  });

  it("each row has edit and delete icon buttons", async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      makeIngredientsPage({ data: [makeIngredient({ id: 1, name: "Matcha Powder" })] }),
    );
    renderIngredientsPage();

    await screen.findByText("Matcha Powder");
    expect(screen.getByRole("button", { name: "Edit Matcha Powder" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Matcha Powder" })).toBeInTheDocument();
  });

  it("delete icon button confirms before calling the API", async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      makeIngredientsPage({ data: [makeIngredient({ id: 1, name: "Matcha Powder" })] }),
    );
    vi.mocked(ingredientsApi.deleteIngredient).mockResolvedValue(undefined);
    renderIngredientsPage();
    const user = userEvent.setup();

    await screen.findByText("Matcha Powder");
    await user.click(screen.getByRole("button", { name: "Delete Matcha Powder" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Delete Matcha Powder?")).toBeInTheDocument();
    expect(ingredientsApi.deleteIngredient).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Delete ingredient" }));

    await waitFor(() => expect(ingredientsApi.deleteIngredient).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("paginates using meta and reflects the page in the URL", async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      makeIngredientsPage({
        meta: {
          current_page: 1,
          from: 1,
          last_page: 3,
          links: [],
          path: "/api/v1/merchant/ingredients",
          per_page: 15,
          to: 15,
          total: 45,
        },
      }),
    );
    renderIngredientsPage();
    const user = userEvent.setup();

    expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();
    const nextButton = within(screen.getByRole("navigation")).getByRole("link", {
      name: /go to next page/i,
    });
    await user.click(nextButton);

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("page=2"));
  });

  it("defaults to 15 rows per page, and does not put the default in the URL", async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(makeIngredientsPage());

    renderIngredientsPage();

    await waitFor(() =>
      expect(ingredientsApi.fetchIngredients).toHaveBeenCalledWith(
        expect.objectContaining({ perPage: 15 }),
      ),
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("per_page=");
  });

  it("choosing 25 or 50 rows per page updates the URL, refetches, and resets to page 1", async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      makeIngredientsPage({
        meta: {
          current_page: 1,
          from: 1,
          last_page: 1,
          links: [],
          path: "/api/v1/merchant/ingredients",
          per_page: 15,
          to: 1,
          total: 1,
        },
      }),
    );
    renderIngredientsPage("/app/inventory?page=2");
    const user = userEvent.setup();

    const perPageTrigger = await screen.findByLabelText("Rows per page");
    await user.click(perPageTrigger);
    await user.click(await screen.findByRole("option", { name: "25" }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("per_page=25"));
    expect(screen.getByTestId("location")).not.toHaveTextContent(/[?&]page=2\b/);
    await waitFor(() =>
      expect(ingredientsApi.fetchIngredients).toHaveBeenLastCalledWith(
        expect.objectContaining({ perPage: 25, page: 1 }),
      ),
    );
  });
});
