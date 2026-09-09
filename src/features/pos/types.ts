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

export interface CheckoutItem {
  product_id: number;
  quantity: number;
  add_ons?: CheckoutAddOn[];
}

export type PaymentMethod = "cash" | "gcash" | "split";

export interface CheckoutRequest {
  payment_method: PaymentMethod;
  /** Split only — both required, both > 0, and cash + gcash must equal the server-computed total exactly. */
  cash_cents?: number;
  gcash_cents?: number;
  discount_cents?: number;
  items: CheckoutItem[];
}

/**
 * The response is the exact same flat order shape the orders list/detail
 * endpoints return (verified live) — reuse the Order type rather than
 * duplicating it, so this stays a single source of truth as that resource
 * evolves.
 */
export type CheckoutResponse = Order;
