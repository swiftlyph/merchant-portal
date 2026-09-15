import type { Order } from "@/features/orders/types";

/**
 * Shapes verified against the real backend (gasa-api) live, not just the
 * spec doc: GET /merchant/menu and POST /merchant/orders. Every money field
 * ships both as integer cents (for computation) and as a server-rendered
 * `*_formatted` string — prefer the formatted string for display; use the
 * cents field only where a number is actually needed (cart math, split
 * remainder). See src/lib/money.ts for the no-float rule this cart math
 * follows throughout.
 */
export interface MenuProduct {
  id: number;
  name: string;
  price_cents: number;
  price_formatted: string;
  currency: string;
  is_available: boolean;
}

export interface MenuResponse {
  data: MenuProduct[];
}

/** name + price are client-supplied for now — no add-on catalog exists yet. */
export interface CheckoutAddOn {
  name: string;
  price_cents: number;
}

export type BeneficiaryType = "senior" | "pwd";

/**
 * F13/P10: one senior/PWD claim on this checkout. Required fields per
 * CheckoutRequest's validation (App\Domains\Orders\Http\Requests\
 * CheckoutRequest) — a blank name or id_number is a 422 validation_failed,
 * and a beneficiary with no line pointing at it (see CheckoutItem.beneficiary
 * below) is a 422 beneficiary_unused.
 */
export interface CheckoutBeneficiary {
  type: BeneficiaryType;
  name: string;
  id_number: string;
}

export interface CheckoutItem {
  product_id: number;
  quantity: number;
  /**
   * F13/P10: an INDEX into the request's own `beneficiaries` array (NOT a
   * database id — there is no id yet, this is the checkout REQUEST) —
   * omitted or undefined for an ordinary line belonging to nobody.
   */
  beneficiary?: number;
  add_ons?: CheckoutAddOn[];
}

export type PaymentMethod = "cash" | "gcash" | "split";

export interface CheckoutRequest {
  payment_method: PaymentMethod;
  /** Split only — both required, both > 0, and cash + gcash must equal the server-computed total exactly. */
  cash_cents?: number;
  gcash_cents?: number;
  /** F13/P10: this is the PROMO discount specifically — applied AFTER any senior/PWD statutory discount. Field name unchanged from before P10 so existing callers keep working; only its meaning narrowed. */
  discount_cents?: number;
  /** F13/P10: the senior citizens/PWDs on this order, if any. Omit entirely (or send []) for an ordinary checkout — this field is purely additive. */
  beneficiaries?: CheckoutBeneficiary[];
  items: CheckoutItem[];
}

/**
 * The response is the exact same flat order shape the orders list/detail
 * endpoints return (verified live) — reuse the Order type rather than
 * duplicating it, so this stays a single source of truth as that resource
 * evolves.
 */
export type CheckoutResponse = Order;
