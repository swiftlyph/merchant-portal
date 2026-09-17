import type { Ingredient, IngredientsPage } from "./types";

export function makeIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 1,
    code: "0001",
    name: "Matcha Powder",
    unit_type: "mass",
    display_unit: "kg",
    quantity_on_hand: 5_000_000,
    quantity_on_hand_formatted: "5",
    low_stock_threshold: 1_000_000,
    low_stock_threshold_formatted: "1",
    stock_status: "in_stock",
    available_units: ["mg", "g", "kg"],
    created_at: "2026-09-09T02:15:00.000Z",
    updated_at: "2026-09-09T02:15:00.000Z",
    ...overrides,
  };
}

export function makeIngredientsPage(overrides: Partial<IngredientsPage> = {}): IngredientsPage {
  return {
    data: [makeIngredient()],
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      links: [],
      path: "/api/v1/merchant/ingredients",
      per_page: 25,
      to: 1,
      total: 1,
    },
    ...overrides,
  };
}
