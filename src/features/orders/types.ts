export type OrderStatus = "pending" | "completed" | "voided";
export type PaymentMethod = "cash" | "gcash" | "split";

export interface OrderAddOn {
  name: string;
  price_cents: number;
}

export interface OrderItem {
  product_name: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
  add_ons: OrderAddOn[];
}

/**
 * Mirrors the flat order object from both the list and detail endpoints.
 * `items` is present on both — the list endpoint's rows carry enough to
 * derive an item count without a second request.
 */
export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  /** Only populated when payment_method is "split"; null otherwise. */
  cash_cents: number | null;
  gcash_cents: number | null;
  created_by_user_id: number;
  completed_at: string | null;
  voided_at: string | null;
  created_at: string;
  items: OrderItem[];
}

export interface PageLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface PageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface OrdersPage {
  data: Order[];
  links: PageLinks;
  meta: PageMeta;
}

export interface OrdersFilters {
  status?: OrderStatus;
  /** Single day, "YYYY-MM-DD". */
  date?: string;
  page?: number;
}
