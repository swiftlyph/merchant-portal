/**
 * Shapes verified against the real backend source (gasa-api), not just the
 * spec doc: App\Domains\CashSessions\Http\Resources\{CashSessionResource,
 * CashMovementResource, CashRemittanceResource, RegisterResource} and their
 * controllers. Every money field ships as integer cents; only the ones the
 * backend actually formats (App\Domains\Shared\Support\Money) also carry a
 * `*_formatted` sibling — `expected_cash_cents`, `counted_cash_cents` and
 * `variance_cents` do NOT have formatted twins server-side, so this feature
 * formats those three itself via src/lib/money.ts. Never recompute
 * expected/counted/variance from other fields — they are exactly what the
 * server sent.
 */

export type CashSessionStatus = "open" | "closed";
export type CashMovementType = "cash_in" | "cash_out";
export type RemittanceStatus = "pending" | "confirmed";

export interface Register {
  id: number;
  name: string;
  is_active: boolean;
  is_default: boolean;
}

export interface RegistersResponse {
  data: Register[];
}

/**
 * Always present on a session, but what it reports differs by status: on
 * an OPEN session every figure (including expected_cash_cents) is live,
 * computed fresh on each read; on a CLOSED session expected/counted/variance
 * are the values FROZEN at close time, never recomputed afterward.
 */
export interface CashReconciliation {
  opening_float_cents: number;
  cash_sales_cents: number;
  voided_cash_cents: number;
  cash_in_cents: number;
  cash_out_cents: number;
  confirmed_remittances_cents: number;
  /** The headline figure. Never recompute this client-side — always the server's number. */
  expected_cash_cents: number;
  /** null while the session is open; set once, at close. */
  counted_cash_cents: number | null;
  /** counted - expected, server-computed. null while open. */
  variance_cents: number | null;
}

export interface CashMovement {
  id: number;
  type: CashMovementType;
  amount_cents: number;
  amount_formatted: string;
  reason: string;
  created_by_user_id: number;
  created_at: string;
}

export interface CashRemittance {
  id: number;
  status: RemittanceStatus;
  amount_cents: number;
  amount_formatted: string;
  note: string | null;
  /** Always null this phase — no upload endpoint exists. */
  attachment_path: string | null;
  created_by_user_id: number;
  confirmed_by_user_id: number | null;
  confirmed_at: string | null;
  created_at: string;
}

/**
 * The flat session object returned by open/show/close and nested inside
 * current/history. `movements`/`remittances` are only present when the
 * backend eager-loaded them (current, show, close) — absent entirely
 * (not null) on `open` and on history list rows. Model as optional.
 */
export interface CashSession {
  id: number;
  register_id: number;
  status: CashSessionStatus;
  opening_float_cents: number;
  opening_float_formatted: string;
  opened_by_user_id: number;
  closed_by_user_id: number | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  reconciliation: CashReconciliation;
  movements?: CashMovement[];
  remittances?: CashRemittance[];
}

/** GET /merchant/cash-sessions/current — always 200; data is null when nothing is open. */
export interface CurrentCashSessionResponse {
  data: CashSession | null;
}

export interface PageLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface PageMetaLink {
  url: string | null;
  label: string;
  active: boolean;
}

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

export interface CashSessionsPage {
  data: CashSession[];
  links: PageLinks;
  meta: PageMeta;
}

export interface CashSessionsFilters {
  status?: CashSessionStatus;
  register_id?: number;
  /** "YYYY-MM-DD" */
  from?: string;
  /** "YYYY-MM-DD" */
  to?: string;
  page?: number;
  perPage?: number;
}

export interface OpenCashSessionRequest {
  register_id?: number;
  opening_float_cents: number;
  notes?: string | null;
}

export interface RecordMovementRequest {
  type: CashMovementType;
  amount_cents: number;
  reason: string;
}

export interface CreateRemittanceRequest {
  amount_cents: number;
  note?: string | null;
}

export interface CloseCashSessionRequest {
  counted_cash_cents: number;
  notes?: string | null;
}

/**
 * GET /merchant/cash-sessions/{id}/z-report (P9) — App\Domains\CashSessions\
 * Http\Resources\ZReportResource. Session-scoped, never date-based: only
 * orders/movements/remittances attributed to THIS drawer session (see
 * `cash_session_id`) are counted — a Reports-page date-range total can
 * legitimately differ, by design (orders rung up with no drawer open are
 * in neither). Works for both open and closed sessions: `cash.*` mirrors
 * the reconciliation panel's fields/order exactly, plus
 * counted_cash/variance, which stay null while the session is open and are
 * FROZEN (not recomputed) once closed — same rule as CashReconciliation.
 */
export interface ZReportSession {
  id: number;
  register_id: number;
  register_name: string;
  opened_by_user_id: number;
  opened_at: string;
  closed_by_user_id: number | null;
  closed_at: string | null;
  status: CashSessionStatus;
}

export interface ZReportFloat {
  opening_float_cents: number;
  opening_float_formatted: string;
}

export interface ZReportPaymentBreakdown {
  count: number;
  amount_cents: number;
  amount_formatted: string;
}

export interface ZReportSales {
  orders_count: number;
  completed_count: number;
  pending_count: number;
  voided_count: number;
  gross_cents: number;
  gross_formatted: string;
  discounts_cents: number;
  discounts_formatted: string;
  net_cents: number;
  net_formatted: string;
  by_payment_method: {
    cash: ZReportPaymentBreakdown;
    gcash: ZReportPaymentBreakdown;
    split: ZReportPaymentBreakdown;
  };
}

export interface ZReportTopItem {
  product_name: string;
  quantity_sold: number;
  net_cents: number;
  net_formatted: string;
}

/**
 * Same fields/order as CashReconciliation, plus counted/variance carrying
 * their own formatted twins here (unlike the session's reconciliation
 * object, which this feature formats client-side — see that type's
 * docblock). Render these rows in THIS order to match the reconciliation
 * panel exactly, per rule 3.
 */
export interface ZReportCash {
  cash_sales_gross_cents: number;
  cash_sales_gross_formatted: string;
  voided_cash_cents: number;
  voided_cash_formatted: string;
  cash_in_cents: number;
  cash_in_formatted: string;
  cash_out_cents: number;
  cash_out_formatted: string;
  confirmed_remittances_cents: number;
  confirmed_remittances_formatted: string;
  expected_cash_cents: number;
  expected_cash_formatted: string;
  /** null while the session is open; frozen at close otherwise. */
  counted_cash_cents: number | null;
  counted_cash_formatted: string | null;
  /** null while the session is open; frozen at close otherwise. */
  variance_cents: number | null;
  variance_formatted: string | null;
}

export interface ZReport {
  session: ZReportSession;
  float: ZReportFloat;
  sales: ZReportSales;
  top_items: ZReportTopItem[];
  cash: ZReportCash;
  movements: CashMovement[];
  remittances: CashRemittance[];
  generated_at: string;
}
