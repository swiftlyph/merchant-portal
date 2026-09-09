import { api } from "@/lib/api/client";
import type {
  CashMovement,
  CashRemittance,
  CashSession,
  CashSessionsFilters,
  CashSessionsPage,
  CloseCashSessionRequest,
  CreateRemittanceRequest,
  CurrentCashSessionResponse,
  OpenCashSessionRequest,
  Register,
  RecordMovementRequest,
  RegistersResponse,
} from "./types";

/**
 * Parsers stay additive-tolerant, following the convention in
 * src/features/orders/api.ts: extra keys the backend adds later pass
 * through untouched, and fields that would otherwise crash a render if
 * missing/malformed are normalized defensively here. `movements` and
 * `remittances` are left untouched when absent (server omits them
 * entirely when not eager-loaded) rather than defaulted to `[]`, so
 * callers can tell "not loaded" apart from "loaded, empty".
 */

function normalizeMovement(raw: Partial<CashMovement> | null | undefined): CashMovement {
  return {
    id: raw?.id ?? 0,
    type: raw?.type ?? "cash_in",
    amount_cents: raw?.amount_cents ?? 0,
    amount_formatted: raw?.amount_formatted ?? "",
    reason: raw?.reason ?? "",
    created_by_user_id: raw?.created_by_user_id ?? 0,
    created_at: raw?.created_at ?? "",
  };
}

function normalizeRemittance(raw: Partial<CashRemittance> | null | undefined): CashRemittance {
  return {
    id: raw?.id ?? 0,
    status: raw?.status ?? "pending",
    amount_cents: raw?.amount_cents ?? 0,
    amount_formatted: raw?.amount_formatted ?? "",
    note: raw?.note ?? null,
    attachment_path: raw?.attachment_path ?? null,
    created_by_user_id: raw?.created_by_user_id ?? 0,
    confirmed_by_user_id: raw?.confirmed_by_user_id ?? null,
    confirmed_at: raw?.confirmed_at ?? null,
    created_at: raw?.created_at ?? "",
  };
}

function normalizeSession(raw: Partial<CashSession> | null | undefined): CashSession {
  return {
    id: raw?.id ?? 0,
    register_id: raw?.register_id ?? 0,
    status: raw?.status ?? "open",
    opening_float_cents: raw?.opening_float_cents ?? 0,
    opening_float_formatted: raw?.opening_float_formatted ?? "",
    opened_by_user_id: raw?.opened_by_user_id ?? 0,
    closed_by_user_id: raw?.closed_by_user_id ?? null,
    opened_at: raw?.opened_at ?? "",
    closed_at: raw?.closed_at ?? null,
    notes: raw?.notes ?? null,
    reconciliation: {
      opening_float_cents: raw?.reconciliation?.opening_float_cents ?? 0,
      cash_sales_cents: raw?.reconciliation?.cash_sales_cents ?? 0,
      voided_cash_cents: raw?.reconciliation?.voided_cash_cents ?? 0,
      cash_in_cents: raw?.reconciliation?.cash_in_cents ?? 0,
      cash_out_cents: raw?.reconciliation?.cash_out_cents ?? 0,
      confirmed_remittances_cents: raw?.reconciliation?.confirmed_remittances_cents ?? 0,
      expected_cash_cents: raw?.reconciliation?.expected_cash_cents ?? 0,
      counted_cash_cents: raw?.reconciliation?.counted_cash_cents ?? null,
      variance_cents: raw?.reconciliation?.variance_cents ?? null,
    },
    ...(Array.isArray(raw?.movements)
      ? { movements: raw.movements.map(normalizeMovement) }
      : {}),
    ...(Array.isArray(raw?.remittances)
      ? { remittances: raw.remittances.map(normalizeRemittance) }
      : {}),
  };
}

function buildQuery(filters: CashSessionsFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.register_id) params.set("register_id", String(filters.register_id));
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.perPage) params.set("per_page", String(filters.perPage));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchRegisters(): Promise<RegistersResponse> {
  const raw = await api.get<Partial<RegistersResponse>>("/merchant/registers");
  return {
    data: Array.isArray(raw.data)
      ? raw.data.map(
          (r: Partial<Register>): Register => ({
            id: r.id ?? 0,
            name: r.name ?? "",
            is_active: r.is_active ?? false,
            is_default: r.is_default ?? false,
          }),
        )
      : [],
  };
}

/** GET /merchant/cash-sessions/current — always 200, `data` is null when nothing is open. */
export async function fetchCurrentSession(registerId?: number): Promise<CurrentCashSessionResponse> {
  const qs = registerId ? `?register_id=${registerId}` : "";
  const raw = await api.get<Partial<CurrentCashSessionResponse>>(
    `/merchant/cash-sessions/current${qs}`,
  );
  return { data: raw.data ? normalizeSession(raw.data) : null };
}

export async function fetchSessionHistory(
  filters: CashSessionsFilters = {},
): Promise<CashSessionsPage> {
  const raw = await api.get<Partial<CashSessionsPage>>(
    `/merchant/cash-sessions${buildQuery(filters)}`,
  );
  return {
    data: Array.isArray(raw.data) ? raw.data.map(normalizeSession) : [],
    links: {
      first: raw.links?.first ?? null,
      last: raw.links?.last ?? null,
      prev: raw.links?.prev ?? null,
      next: raw.links?.next ?? null,
    },
    meta: {
      current_page: raw.meta?.current_page ?? 1,
      from: raw.meta?.from ?? null,
      last_page: raw.meta?.last_page ?? 1,
      links: Array.isArray(raw.meta?.links) ? raw.meta.links : [],
      path: raw.meta?.path ?? "",
      per_page: raw.meta?.per_page ?? 0,
      to: raw.meta?.to ?? null,
      total: raw.meta?.total ?? 0,
    },
  };
}

export async function fetchSession(id: number | string): Promise<CashSession> {
  const raw = await api.get<Partial<CashSession>>(`/merchant/cash-sessions/${id}`);
  return normalizeSession(raw);
}

export function openSession(request: OpenCashSessionRequest): Promise<CashSession> {
  return api.post<Partial<CashSession>>("/merchant/cash-sessions", request).then(normalizeSession);
}

export function recordMovement(
  sessionId: number | string,
  request: RecordMovementRequest,
): Promise<CashMovement> {
  return api
    .post<Partial<CashMovement>>(`/merchant/cash-sessions/${sessionId}/movements`, request)
    .then(normalizeMovement);
}

export function createRemittance(
  sessionId: number | string,
  request: CreateRemittanceRequest,
): Promise<CashRemittance> {
  return api
    .post<Partial<CashRemittance>>(`/merchant/cash-sessions/${sessionId}/remittances`, request)
    .then(normalizeRemittance);
}

export function confirmRemittance(remittanceId: number | string): Promise<CashRemittance> {
  return api
    .post<Partial<CashRemittance>>(`/merchant/remittances/${remittanceId}/confirm`)
    .then(normalizeRemittance);
}

export function closeSession(
  sessionId: number | string,
  request: CloseCashSessionRequest,
): Promise<CashSession> {
  return api
    .post<Partial<CashSession>>(`/merchant/cash-sessions/${sessionId}/close`, request)
    .then(normalizeSession);
}
