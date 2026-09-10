export type OrderStatus = "pending" | "completed" | "voided";
export type PaymentMethod = "cash" | "gcash" | "split";

/**
 * Shapes verified against the real backend source (gasa-api), not just the
 * spec doc: App\Domains\Orders\Http\Resources\{OrderResource,
 * OrderItemResource, OrderItemAddOnResource}. Every money field ships both
 * as integer cents (for computation) and as a server-rendered `*_formatted`
 * string (App\Domains\Shared\Support\Money) — prefer the formatted string
 * for display so this app never drifts from receipts/kitchen tickets on
 * rounding or symbol placement; use the cents field only where a number is
 * actually needed.
 */
export interface OrderAddOn {
  id: number;
  name: string;
  price_cents: number;
  price_formatted: string;
}

export interface OrderItem {
  id: number;
  /** Null once the catalog product has been deleted; product_name/unit_price still render in full. */
  product_id: number | null;
  product_name: string;
  unit_price_cents: number;
  unit_price_formatted: string;
  quantity: number;
  line_total_cents: number;
  line_total_formatted: string;
  add_ons: OrderAddOn[];
}

/**
 * Mirrors the flat order object from both the list and detail endpoints
 * (OrderResource — identical shape on both, per its own docblock).
 */
export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  currency: string;
  subtotal_cents: number;
  subtotal_formatted: string;
  discount_cents: number;
  discount_formatted: string;
  total_cents: number;
  total_formatted: string;
  payment_method: PaymentMethod;
  /** Only populated when payment_method is "split"; null otherwise — never 0. */
  cash_cents: number | null;
  cash_formatted: string | null;
  gcash_cents: number | null;
  gcash_formatted: string | null;
  created_by_user_id: number;
  /** The user who voided this order, if it was voided; null otherwise. */
  voided_by_user_id: number | null;
  completed_at: string | null;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface PageLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

/** A page-number link in meta.links, e.g. { url, label: "2", active: false }. */
export interface PageMetaLink {
  url: string | null;
  label: string;
  active: boolean;
}

/**
 * Laravel's standard LengthAwarePaginator shape (this app only uses
 * current_page/last_page/per_page/total; from/to/path/links are passed
 * through untouched for a future page-size indicator if ever needed).
 */
export interface PageMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  links: PageMetaLink[];
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface OrdersPage {
  data: Order[];
  links: PageLinks;
  meta: PageMeta;
}

export interface OrdersFilters {
  status?: OrderStatus;
  /** Single day, "YYYY-MM-DD" — validated server-side with date_format:Y-m-d. */
  date?: string;
  page?: number;
  /** 1-100, defaults server-side to 25 when omitted. */
  perPage?: number;
}

/**
 * GET /merchant/orders/{id}/receipt (P9) — App\Domains\Orders\Http\
 * Resources\ReceiptResource. A DIFFERENT shape from Order: it carries the
 * LIVE merchant profile (never snapshotted — a header/footer edit shows up
 * on every reprint, even of an old order) alongside a snapshot of the order
 * itself (item names/prices are what OrderItem stored at sale time, so a
 * later catalog rename never changes a past receipt). Returns 200 — never
 * 404/403 for status reasons — even for a voided order; `order.voided` is
 * the signal to render the VOIDED banner, not the HTTP status.
 */
export interface ReceiptMerchant {
  name: string;
  legal_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  tax_identifier: string | null;
  receipt_header: string | null;
  receipt_footer: string | null;
}

export interface ReceiptAddOn {
  name: string;
  price_cents: number;
  price_formatted: string;
}

export interface ReceiptLine {
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  unit_price_formatted: string;
  line_total_cents: number;
  line_total_formatted: string;
  add_ons: ReceiptAddOn[];
}

export interface ReceiptOrder {
  id: number;
  order_number: string;
  status: OrderStatus;
  created_at: string;
  voided: boolean;
  voided_at: string | null;
  cashier_name: string;
  lines: ReceiptLine[];
  subtotal_cents: number;
  subtotal_formatted: string;
  /** Singular — receipt's own field name, NOT the same as Z-report's plural `discounts_cents`. */
  discount_cents: number;
  discount_formatted: string;
  total_cents: number;
  total_formatted: string;
  payment_method: PaymentMethod;
  /** Populated only when payment_method is "split"; null otherwise. */
  cash_cents: number | null;
  cash_formatted: string | null;
  gcash_cents: number | null;
  gcash_formatted: string | null;
}

export interface Receipt {
  merchant: ReceiptMerchant;
  order: ReceiptOrder;
  generated_at: string;
}
