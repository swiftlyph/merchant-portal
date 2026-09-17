import { api } from "@/lib/api/client";
import { buildQueryString, normalizePage } from "@/lib/api/pagination";
import type {
  CreateIngredientInput,
  Ingredient,
  IngredientsFilters,
  IngredientsPage,
  UpdateIngredientInput,
} from "./types";

/** Additive-tolerant parser: missing/malformed fields degrade, never throw. */
export function normalizeIngredient(raw: Partial<Ingredient> | null | undefined): Ingredient {
  return {
    id: raw?.id ?? 0,
    code: raw?.code ?? "",
    name: raw?.name ?? "",
    unit_type: raw?.unit_type ?? "count",
    display_unit: raw?.display_unit ?? "pcs",
    quantity_on_hand: raw?.quantity_on_hand ?? 0,
    quantity_on_hand_formatted: raw?.quantity_on_hand_formatted ?? "0",
    low_stock_threshold: raw?.low_stock_threshold ?? 0,
    low_stock_threshold_formatted: raw?.low_stock_threshold_formatted ?? "0",
    stock_status: raw?.stock_status ?? "in_stock",
    available_units: Array.isArray(raw?.available_units) ? raw.available_units : ["pcs"],
    created_at: raw?.created_at ?? "",
    updated_at: raw?.updated_at ?? "",
  };
}

export async function fetchIngredients(filters: IngredientsFilters = {}): Promise<IngredientsPage> {
  const qs = buildQueryString({
    status: filters.status,
    page: filters.page,
    per_page: filters.perPage,
  });
  const raw = await api.get<Partial<IngredientsPage>>(`/merchant/ingredients${qs}`);
  return normalizePage(raw, normalizeIngredient);
}

/** 201 with the created ingredient; 422 `validation_failed` carries per-field errors. */
export async function createIngredient(input: CreateIngredientInput): Promise<Ingredient> {
  const raw = await api.post<Partial<Ingredient>>("/merchant/ingredients", input);
  return normalizeIngredient(raw);
}

/** 200 with the updated ingredient; 422 `validation_failed` carries per-field errors. */
export async function updateIngredient(
  id: number | string,
  input: UpdateIngredientInput,
): Promise<Ingredient> {
  const raw = await api.patch<Partial<Ingredient>>(`/merchant/ingredients/${id}`, input);
  return normalizeIngredient(raw);
}

/** 204 on success; 409 `ingredient_in_use` if a product's recipe still references it; a foreign/unknown id is a 404. */
export function deleteIngredient(id: number | string): Promise<void> {
  return api.delete<void>(`/merchant/ingredients/${id}`);
}
