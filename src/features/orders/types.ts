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
  /** Pre-discount, VAT-inclusive line amount — UNCHANGED meaning from before P10/F13. */
  line_total_cents: number;
  line_total_formatted: string;
  /**
   * F13/P10: which beneficiary (if any) this line is assigned to — the
   * DATABASE ID of a row in the order's `beneficiaries` array below, never
   * an index. Null on every ordinary line (most lines).
   */
  beneficiary_id: number | null;
  /** This line's STATUTORY (senior/PWD) discount only — 0 on every ordinary line. The order-level promo discount never appears here. */
  discount_cents: number;
  discount_formatted: string;
  /** What is actually owed for this line: line_total_cents minus this line's own discount_cents (VAT-registered beneficiary lines compute this off the VAT-exclusive net — see OrderTax's docblock). */
  payable_cents: number;
  payable_formatted: string;
  add_ons: OrderAddOn[];
}

/**
 * F13/P10: one person who claimed a senior/PWD discount on this order.
 * `discount_cents` here is their OWN 20%-savings figure (never the VAT
 * relief folded in) — the number that should print next to their name.
 */
export interface OrderBeneficiary {
  id: number;
  type: "senior" | "pwd";
  type_label: string;
  name: string;
  id_number: string;
  discount_cents: number;
  discount_formatted: string;
  vat_exempt_sales_cents: number;
  vat_exempt_sales_formatted: string;
}

/**
 * F13/P10: the tax decomposition, additive on the order response.
 * `vat_registered` is a SNAPSHOT of the merchant's toggle at THIS order's
 * checkout time — never the merchant's current setting, so this never
 * changes for an order already placed even if the merchant's VAT
 * registration is toggled afterward.
 *
 * `statutory_discount_cents` is the TOTAL relief a beneficiary's lines
 * received — on a VAT-registered order that includes both the 20% AND the
 * VAT they were relieved of, NOT just the 20% (that narrower figure is
 * what's on each OrderBeneficiary/OrderItem's own `discount_cents`
 * instead). `promo_discount_cents` is the order-level discount typed into
 * the POS. Order.discount_cents/discount_formatted is UNCHANGED — it's
 * still statutory + promo combined.
 */
export interface OrderTax {
  vat_registered: boolean;
  vat_rate_bps: number;
  vatable_sales_cents: number;
  vatable_sales_formatted: string;
  vat_cents: number;
  vat_formatted: string;
  vat_exempt_sales_cents: number;
  vat_exempt_sales_formatted: string;
  nonvat_sales_cents: number;
  nonvat_sales_formatted: string;
  statutory_discount_cents: number;
  statutory_discount_formatted: string;
  promo_discount_cents: number;
  promo_discount_formatted: string;
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
  /** F13/P10: additive. Always present — the tax decomposition for this order, VAT-registered or not. */
  tax: OrderTax;
  /** F13/P10: additive. Usually empty — one entry per person who claimed a senior/PWD discount on this order. */
  beneficiaries: OrderBeneficiary[];
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
  /** F13/P10: this line's own statutory discount and what was actually owed for it. 0/line_total on an ordinary line. */
  discount_cents: number;
  discount_formatted: string;
  payable_cents: number;
  payable_formatted: string;
  add_ons: ReceiptAddOn[];
}

/** F13/P10: printed per beneficiary on the receipt — same shape as OrderBeneficiary minus the database id, which the receipt has no need to expose. */
export interface ReceiptBeneficiary {
  type: "senior" | "pwd";
  type_label: string;
  name: string;
  id_number: string;
  discount_cents: number;
  discount_formatted: string;
}

/**
 * F13/P10: the receipt's OWN tax block — a DIFFERENT shape from OrderTax,
 * verified against ReceiptResource::taxBlock() directly rather than
 * assumed to match the order response field-for-field:
 *
 *   - VAT-registered order: vat_registered=true plus the VAT breakdown
 *     (vatable/vat/vat_exempt sales) — but NO `nonvat_sales_*` fields at
 *     all, and no `non_vat_note`.
 *   - Non-VAT order: vat_registered=false plus `non_vat_note` and
 *     `nonvat_sales_*` — but NO vatable/vat/vat_exempt fields at all.
 *
 * The two shapes are mutually exclusive on the wire (never zeros standing
 * in for "not applicable") — model as a union so a component is forced to
 * branch on `vat_registered` rather than accidentally rendering a VAT
 * figure that doesn't exist on a non-VAT receipt.
 */
export type ReceiptTax =
  | {
      vat_registered: true;
      vat_rate_bps: number;
      vatable_sales_cents: number;
      vatable_sales_formatted: string;
      vat_cents: number;
      vat_formatted: string;
      vat_exempt_sales_cents: number;
      vat_exempt_sales_formatted: string;
    }
  | {
      vat_registered: false;
      non_vat_note: string;
      nonvat_sales_cents: number;
      nonvat_sales_formatted: string;
    };

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
  /** Singular — receipt's own field name, NOT the same as Z-report's plural `discounts_cents`. Unchanged meaning: statutory + promo combined. */
  discount_cents: number;
  discount_formatted: string;
  /** F13/P10: the two causes that sum to discount_cents above. */
  statutory_discount_cents: number;
  statutory_discount_formatted: string;
  promo_discount_cents: number;
  promo_discount_formatted: string;
  total_cents: number;
  total_formatted: string;
  /** F13/P10: the tax block — see ReceiptTax's docblock for the two mutually-exclusive shapes. */
  tax: ReceiptTax;
  /** F13/P10: usually empty. */
  beneficiaries: ReceiptBeneficiary[];
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
