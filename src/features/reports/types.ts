/**
 * Shapes verified against the real backend source (gasa-api, P6):
 * App\Domains\Orders\Http\Controllers\ReportController and
 * App\Domains\Orders\Reports\{SalesSummaryReport,SalesByDayReport,TopItemsReport}.
 * Every money field ships as integer cents alongside a `*_formatted` string
 * from the same Money helper the rest of the app already renders from —
 * never reformat a `*_cents` value client-side when its formatted twin is
 * present.
 *
 * All three endpoints share `from`/`to` (inclusive, merchant-local calendar
 * days, defaulting to today) via ReportDateRangeRequest — see
 * ReportRangeTooLarge for the range cap.
 */

export type PaymentMethodBucketKey = "cash" | "gcash" | "split";

export interface PaymentMethodBucket {
  count: number;
  amount_cents: number;
  amount_formatted: string;
}

/** GET /merchant/reports/sales-summary */
export interface SalesSummary {
  orders_count: number;
  completed_count: number;
  voided_count: number;

  gross_cents: number;
  gross_formatted: string;
  discount_cents: number;
  discount_formatted: string;
  net_cents: number;
  net_formatted: string;

  by_payment_method: Record<PaymentMethodBucketKey, PaymentMethodBucket>;

  average_order_cents: number;
  average_order_formatted: string;
}

/** One row of GET /merchant/reports/sales-by-day's `data` array. */
export interface SalesByDayRow {
  /** "YYYY-MM-DD", merchant-local. */
  date: string;
  orders_count: number;
  net_cents: number;
  net_formatted: string;
}

export interface SalesByDayResponse {
  data: SalesByDayRow[];
}

/** One row of GET /merchant/reports/top-items's `data` array. */
export interface TopItemRow {
  /** The snapshot name stored on the order line — survives rename/delete of the product. */
  product_name: string;
  quantity_sold: number;
  net_cents: number;
  net_formatted: string;
}

export interface TopItemsResponse {
  data: TopItemRow[];
}

/** "YYYY-MM-DD", inclusive on both ends. Omit either to default to today. */
export interface ReportRangeParams {
  from?: string;
  to?: string;
}

export interface TopItemsParams extends ReportRangeParams {
  /** Default 10, max 50 — TopItemsReport::DEFAULT_LIMIT / MAX_LIMIT. */
  limit?: number;
}
