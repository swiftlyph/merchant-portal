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
