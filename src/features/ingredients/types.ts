import type { Paginated } from "@/lib/api/pagination";

/** A unit's measurement family. Conversion only ever happens within one family — see the Unit type below. */
export type UnitType = "mass" | "volume" | "count";

/**
 * Every unit the API understands. Milligram/milliliter/piece are each
 * family's base unit — what quantities are actually stored as server-side
 * (gasa-api: App\Domains\Catalog\Enums\Unit). The frontend never converts
 * between these itself; it only ever sends a (quantity, unit) pair the
 * server converts, and renders the `*_formatted` strings the server sends
 * back — same "don't do money math on the client" rule as `price_cents`.
 */
export type Unit = "mg" | "g" | "kg" | "ml" | "l" | "pcs";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

/**
 * An ingredient — this merchant's actual inventory (gasa-api: App\Domains\
 * Catalog\Http\Resources\IngredientResource). A product carries no stock of
 * its own; only its recipe's ingredients do (see features/products/types.ts).
 */
export interface Ingredient {
  /** Numeric key, used only in URLs. */
  id: number;
  /** The four-digit ID people see, e.g. "0001" — a zero-padded rendering of `id`, not a separate sequence. */
  code: string;
  name: string;
  /** Immutable after creation — every stored quantity is already in this family's base unit. */
  unit_type: UnitType;
  /** Which unit `quantity_on_hand`/`low_stock_threshold` are rendered in; editable independently of unit_type. */
  display_unit: Unit;
  /** Base-unit integer. Prefer the `_formatted` twin for display. */
  quantity_on_hand: number;
  quantity_on_hand_formatted: string;
  low_stock_threshold: number;
  low_stock_threshold_formatted: string;
  stock_status: StockStatus;
  /** The units `unit_type` supports, for feeding a unit dropdown (recipe lines, this ingredient's own edit form). */
  available_units: Unit[];
  created_at: string;
  updated_at: string;
}

export type IngredientsPage = Paginated<Ingredient>;

export interface IngredientsFilters {
  status?: StockStatus;
  page?: number;
  /** 1-100, defaults server-side to 25 when omitted. */
  perPage?: number;
}

/**
 * Body for POST /merchant/ingredients. `quantity_on_hand`/`low_stock_threshold`
 * are entered in `display_unit` — the server converts to base units.
 */
export interface CreateIngredientInput {
  name: string;
  unit_type: UnitType;
  display_unit: Unit;
  quantity_on_hand?: number;
  low_stock_threshold?: number;
}

/**
 * Body for PATCH /merchant/ingredients/{id}. No `unit_type` — immutable
 * after creation (see the field's docblock above).
 */
export interface UpdateIngredientInput {
  name?: string;
  display_unit?: Unit;
  quantity_on_hand?: number;
  low_stock_threshold?: number;
}
