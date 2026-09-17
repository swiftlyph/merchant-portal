import type { Product, ProductsPage, RecipeItem } from "./types";
import { formatCents } from "@/lib/money";

export function makeRecipeItem(overrides: Partial<RecipeItem> = {}): RecipeItem {
  return {
    id: 1,
    ingredient_id: 1,
    ingredient_code: "0001",
    ingredient_name: "Matcha Powder",
    quantity: 30,
    unit: "g",
    ingredient_stock_status: "in_stock",
    ...overrides,
  };
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  const currency = overrides.currency ?? "PHP";
  const priceCents = overrides.price_cents ?? 15000;

  return {
    id: 1,
    name: "Iced Latte",
    code: "DRK-001",
    category: "Drinks",
    description: null,
    currency,
    price_cents: priceCents,
    price_formatted: formatCents(priceCents, currency),
    status: "active",
    in_stock: true,
    recipe: [],
    created_at: "2026-09-09T02:15:00.000Z",
    updated_at: "2026-09-09T02:15:00.000Z",
    ...overrides,
  };
}

export function makeProductsPage(overrides: Partial<ProductsPage> = {}): ProductsPage {
  return {
    data: [makeProduct()],
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      links: [],
      path: "/api/v1/merchant/products",
      per_page: 25,
      to: 1,
      total: 1,
    },
    ...overrides,
  };
}
