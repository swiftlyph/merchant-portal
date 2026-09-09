import { formatCents } from "@/lib/money";
import type {
  CashMovement,
  CashReconciliation,
  CashRemittance,
  CashSession,
  CashSessionsPage,
  Register,
  RegistersResponse,
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
