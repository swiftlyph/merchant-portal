import { formatCents } from "@/lib/money";
import type {
  CashMovement,
  CashReconciliation,
  CashRemittance,
  CashSession,
  CashSessionsPage,
  Register,
  RegistersResponse,
  ZReport,
} from "./types";

export function makeRegister(overrides: Partial<Register> = {}): Register {
  return { id: 1, name: "Main Register", is_active: true, is_default: true, ...overrides };
}

export function makeRegistersResponse(overrides: Partial<RegistersResponse> = {}): RegistersResponse {
  return { data: [makeRegister()], ...overrides };
}

export function makeReconciliation(overrides: Partial<CashReconciliation> = {}): CashReconciliation {
  return {
    opening_float_cents: 100000,
    cash_sales_cents: 0,
    voided_cash_cents: 0,
    cash_in_cents: 0,
    cash_out_cents: 0,
    confirmed_remittances_cents: 0,
    expected_cash_cents: 100000,
    counted_cash_cents: null,
    variance_cents: null,
    ...overrides,
  };
}

export function makeMovement(overrides: Partial<CashMovement> = {}): CashMovement {
  const amount_cents = overrides.amount_cents ?? 5000;
  return {
    id: 1,
    type: "cash_in",
    amount_cents,
    amount_formatted: formatCents(amount_cents),
    reason: "Change fund top-up",
    created_by_user_id: 1,
    created_at: "2026-09-10T02:00:00.000Z",
    ...overrides,
  };
}

export function makeRemittance(overrides: Partial<CashRemittance> = {}): CashRemittance {
  const amount_cents = overrides.amount_cents ?? 20000;
  return {
    id: 1,
    status: "pending",
    amount_cents,
    amount_formatted: formatCents(amount_cents),
    note: null,
    attachment_path: null,
    created_by_user_id: 1,
    confirmed_by_user_id: null,
    confirmed_at: null,
    created_at: "2026-09-10T02:05:00.000Z",
    ...overrides,
  };
}

export function makeSession(overrides: Partial<CashSession> = {}): CashSession {
  const opening_float_cents = overrides.opening_float_cents ?? 100000;
  return {
    id: 1,
    register_id: 1,
    status: "open",
    opening_float_cents,
    opening_float_formatted: formatCents(opening_float_cents),
    opened_by_user_id: 1,
    closed_by_user_id: null,
    opened_at: "2026-09-10T01:00:00.000Z",
    closed_at: null,
    notes: null,
    reconciliation: makeReconciliation({ opening_float_cents }),
    movements: [],
    remittances: [],
    ...overrides,
  };
}

export function makeZReport(overrides: Partial<ZReport> = {}): ZReport {
  return {
    session: {
      id: 1,
      register_id: 1,
      register_name: "Main Register",
      opened_by_user_id: 1,
      opened_at: "2026-09-10T01:00:00.000Z",
      closed_by_user_id: null,
      closed_at: null,
      status: "open",
      ...overrides.session,
    },
    float: {
      opening_float_cents: 100000,
      opening_float_formatted: formatCents(100000),
      ...overrides.float,
    },
    sales: {
      orders_count: 4,
      completed_count: 0,
      pending_count: 3,
      voided_count: 1,
      gross_cents: 30000,
      gross_formatted: formatCents(30000),
      discounts_cents: 0,
      discounts_formatted: formatCents(0),
      statutory_discount_cents: 0,
      statutory_discount_formatted: formatCents(0),
      promo_discount_cents: 0,
      promo_discount_formatted: formatCents(0),
      vatable_sales_cents: 0,
      vatable_sales_formatted: formatCents(0),
      vat_cents: 0,
      vat_formatted: formatCents(0),
      vat_exempt_sales_cents: 0,
      vat_exempt_sales_formatted: formatCents(0),
      nonvat_sales_cents: 30000,
      nonvat_sales_formatted: formatCents(30000),
      net_cents: 30000,
      net_formatted: formatCents(30000),
      by_payment_method: {
        cash: { count: 1, amount_cents: 14000, amount_formatted: formatCents(14000) },
        gcash: { count: 1, amount_cents: 16000, amount_formatted: formatCents(16000) },
        split: { count: 1, amount_cents: 10000, amount_formatted: formatCents(10000) },
      },
      ...overrides.sales,
    },
    top_items: overrides.top_items ?? [
      { product_name: "Cafe Latte (16oz)", quantity_sold: 3, net_cents: 30000, net_formatted: formatCents(30000) },
    ],
    cash: {
      cash_sales_gross_cents: 24000,
      cash_sales_gross_formatted: formatCents(24000),
      voided_cash_cents: 10000,
      voided_cash_formatted: formatCents(10000),
      cash_in_cents: 20000,
      cash_in_formatted: formatCents(20000),
      cash_out_cents: 5000,
      cash_out_formatted: formatCents(5000),
      confirmed_remittances_cents: 30000,
      confirmed_remittances_formatted: formatCents(30000),
      expected_cash_cents: 99000,
      expected_cash_formatted: formatCents(99000),
      counted_cash_cents: null,
      counted_cash_formatted: null,
      variance_cents: null,
      variance_formatted: null,
      ...overrides.cash,
    },
    movements: overrides.movements ?? [makeMovement()],
    remittances: overrides.remittances ?? [makeRemittance()],
    generated_at: "2026-09-10T14:32:00.000Z",
    ...overrides,
  };
}

export function makeSessionsPage(overrides: Partial<CashSessionsPage> = {}): CashSessionsPage {
  return {
    data: [makeSession()],
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      links: [],
      path: "",
      per_page: 25,
      to: 1,
      total: 1,
    },
    ...overrides,
  };
}
