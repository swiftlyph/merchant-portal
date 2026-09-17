import { api } from "@/lib/api/client";
import { buildQueryString, normalizePage } from "@/lib/api/pagination";
import type {
  CreateProductInput,
  Product,
  ProductCategory,
  ProductsFilters,
  ProductsPage,
  RecipeItem,
  UpdateProductInput,
  UpdateRecipeInput,
} from "./types";

function normalizeRecipeItem(raw: Partial<RecipeItem> | null | undefined): RecipeItem {
  return {
    id: raw?.id ?? 0,
    ingredient_id: raw?.ingredient_id ?? 0,
    ingredient_code: raw?.ingredient_code ?? "",
    ingredient_name: raw?.ingredient_name ?? "",
    quantity: raw?.quantity ?? 0,
    unit: raw?.unit ?? "pcs",
    ingredient_stock_status: raw?.ingredient_stock_status ?? "in_stock",
  };
}

/** Additive-tolerant parser: missing/malformed fields degrade, never throw. */
export function normalizeProduct(raw: Partial<Product> | null | undefined): Product {
  return {
    id: raw?.id ?? 0,
    code: raw?.code ?? "",
    name: raw?.name ?? "",
    category: raw?.category ?? "",
    description: raw?.description ?? null,
    currency: raw?.currency ?? "PHP",
    price_cents: raw?.price_cents ?? 0,
    price_formatted: raw?.price_formatted ?? "",
    status: raw?.status ?? "active",
    in_stock: raw?.in_stock ?? true,
    recipe: Array.isArray(raw?.recipe) ? raw.recipe.map(normalizeRecipeItem) : [],
    created_at: raw?.created_at ?? "",
    updated_at: raw?.updated_at ?? "",
  };
}

export async function fetchProducts(filters: ProductsFilters = {}): Promise<ProductsPage> {
  const qs = buildQueryString({
    status: filters.status,
    category: filters.category,
    page: filters.page,
    per_page: filters.perPage,
  });
  const raw = await api.get<Partial<ProductsPage>>(`/merchant/products${qs}`);
  return normalizePage(raw, normalizeProduct);
}

export async function fetchProduct(id: number | string): Promise<Product> {
  const raw = await api.get<Partial<Product>>(`/merchant/products/${id}`);
  return normalizeProduct(raw);
}

/** 201 with the created product; 422 `validation_failed` carries per-field errors. */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  const raw = await api.post<Partial<Product>>("/merchant/products", input);
  return normalizeProduct(raw);
}

/** 200 with the updated product; 422 `validation_failed` carries per-field errors. */
export async function updateProduct(
  id: number | string,
  input: UpdateProductInput,
): Promise<Product> {
  const raw = await api.patch<Partial<Product>>(`/merchant/products/${id}`, input);
  return normalizeProduct(raw);
}

/** 204 on success; a foreign or unknown id is a 404 `not_found`. */
export function deleteProduct(id: number | string): Promise<void> {
  return api.delete<void>(`/merchant/products/${id}`);
}

/**
 * Replaces a product's entire recipe. 200 with the updated product (its
 * `recipe` reflects exactly what was sent); 422 `validation_failed` — a
 * line whose `unit` isn't one of that ingredient's own family, a
 * duplicate ingredient across lines, or a foreign/unknown ingredient id —
 * carries per-line errors under `ingredients.{index}.{field}`.
 */
export async function updateProductRecipe(
  id: number | string,
  input: UpdateRecipeInput,
): Promise<Product> {
  const raw = await api.put<Partial<Product>>(`/merchant/products/${id}/recipe`, input);
  return normalizeProduct(raw);
}

/**
 * The fixed category list, as a plain array (not paginated). Entries
 * missing a name or prefix are dropped rather than rendered as blanks.
 */
export async function fetchCategories(): Promise<ProductCategory[]> {
  const raw = await api.get<unknown>("/merchant/catalog/categories");
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: Partial<ProductCategory> | null) =>
    typeof item?.name === "string" && typeof item?.prefix === "string"
      ? [{ name: item.name, prefix: item.prefix }]
      : [],
  );
}
