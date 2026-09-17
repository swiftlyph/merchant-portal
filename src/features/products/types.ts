import type { Paginated } from "@/lib/api/pagination";
import type { StockStatus, Unit } from "@/features/ingredients/types";

export type ProductStatus = "active" | "inactive";

/**
 * A catalog category and the prefix its product IDs are issued with, from
 * GET /merchant/catalog/categories (gasa-api: config/catalog.php). The list
 * is fixed server-side; the add form's dropdown is fed from it.
 */
export interface ProductCategory {
  name: string;
  prefix: string;
}

/**
 * One line of a product's recipe — how much of one ingredient one unit of
 * the product consumes, embedded on every product endpoint (gasa-api:
 * App\Domains\Catalog\Http\Resources\RecipeItemResource). `quantity`/`unit`
 * are exactly as entered; the server converts and stores the base-unit
 * equivalent itself — the frontend never does that math (see
 * features/ingredients/types.ts's `Unit` docblock).
 */
export interface RecipeItem {
  id: number;
  ingredient_id: number;
  ingredient_code: string;
  ingredient_name: string;
  quantity: number;
  unit: Unit;
  ingredient_stock_status: StockStatus;
}

/**
 * Catalog product as returned by every /merchant/products endpoint
 * (gasa-api: App\Domains\Catalog\Http\Resources\ProductResource). Money
 * ships as integer cents plus a server-rendered `*_formatted` string —
 * prefer the formatted string for display.
 */
export interface Product {
  /** Numeric key, used only in URLs. Never shown to people. */
  id: number;
  /**
   * The product ID people see, e.g. "DRK-001": the category's prefix plus a
   * per-merchant counter, issued by the server — on create, and reissued
   * again whenever an update actually changes the category (never sent by
   * the client either way; see EditProductDialog's live preview of what
   * saving will do to it).
   */
  code: string;
  name: string;
  category: string;
  description: string | null;
  currency: string;
  price_cents: number;
  price_formatted: string;
  status: ProductStatus;
  /**
   * Whether every recipe ingredient currently has enough on hand for one
   * more unit — vacuously true for a recipe-less product (e.g. a
   * made-to-order drink). A DIFFERENT statement from `status`: this says
   * nothing about the merchant's manual toggle, only whether a sale would
   * go through right now.
   */
  in_stock: boolean;
  /** What this product is made of. Empty for a plain resale item or a made-to-order drink with no tracked ingredients (ice, hot water). */
  recipe: RecipeItem[];
  created_at: string;
  updated_at: string;
}

export type ProductsPage = Paginated<Product>;

export interface ProductsFilters {
  status?: ProductStatus;
  category?: string;
  page?: number;
  /** 1-100, defaults server-side to 25 when omitted. */
  perPage?: number;
}

/**
 * Body for POST /merchant/products. There is no code field: the server
 * issues it from `category`. A product's recipe is set separately, after
 * creation, via updateProductRecipe — see UpdateRecipeInput below.
 */
export interface CreateProductInput {
  name: string;
  category: string;
  description?: string;
  price_cents: number;
  status?: ProductStatus;
}

/**
 * Body for PATCH /merchant/products/{id}. Same shape as create minus
 * `code` (never accepted — it's immutable after issue). Every field is
 * sent on every save from the edit form, so this is really the same
 * input as create; kept as a distinct alias so the two can diverge later
 * without one silently affecting the other.
 */
export type UpdateProductInput = CreateProductInput;

/** One line of a recipe-replacement request. */
export interface RecipeLineInput {
  ingredient_id: number;
  quantity: number;
  unit: Unit;
}

/**
 * Body for PUT /merchant/products/{id}/recipe. Replaces the product's
 * ENTIRE recipe in one call — an empty `ingredients` array clears it,
 * making the product stock-unconstrained again (see RecipeEditorDialog).
 */
export interface UpdateRecipeInput {
  ingredients: RecipeLineInput[];
}
