import { api } from "@/lib/api/client";
import type {
  PaymentMethodBucket,
  PaymentMethodBucketKey,
  ReportRangeParams,
  SalesByDayResponse,
  SalesByDayRow,
  SalesSummary,
  TopItemRow,
  TopItemsParams,
  TopItemsResponse,
} from "./types";

/**
 * Parsers stay additive-tolerant, following the convention in
 * src/features/orders/api.ts and src/features/cash-sessions/api.ts: extra
 * keys the backend adds later pass through untouched, and every field is
 * normalized defensively so a missing/malformed value can't crash a render.
 */

function normalizeBucket(raw: Partial<PaymentMethodBucket> | null | undefined): PaymentMethodBucket {
  return {
    count: raw?.count ?? 0,
    amount_cents: raw?.amount_cents ?? 0,
    amount_formatted: raw?.amount_formatted ?? "",
  };
}

function normalizeSummary(raw: Partial<SalesSummary> | null | undefined): SalesSummary {
  const buckets = raw?.by_payment_method;
  const bucketKeys: PaymentMethodBucketKey[] = ["cash", "gcash", "split"];
  return {
    orders_count: raw?.orders_count ?? 0,
    completed_count: raw?.completed_count ?? 0,
    voided_count: raw?.voided_count ?? 0,
    gross_cents: raw?.gross_cents ?? 0,
    gross_formatted: raw?.gross_formatted ?? "",
    discount_cents: raw?.discount_cents ?? 0,
    discount_formatted: raw?.discount_formatted ?? "",
    net_cents: raw?.net_cents ?? 0,
    net_formatted: raw?.net_formatted ?? "",
    by_payment_method: Object.fromEntries(
      bucketKeys.map((key) => [key, normalizeBucket(buckets?.[key])]),
    ) as SalesSummary["by_payment_method"],
    average_order_cents: raw?.average_order_cents ?? 0,
    average_order_formatted: raw?.average_order_formatted ?? "",
  };
}

function normalizeDayRow(raw: Partial<SalesByDayRow> | null | undefined): SalesByDayRow {
  return {
    date: raw?.date ?? "",
    orders_count: raw?.orders_count ?? 0,
    net_cents: raw?.net_cents ?? 0,
    net_formatted: raw?.net_formatted ?? "",
  };
}

function normalizeTopItem(raw: Partial<TopItemRow> | null | undefined): TopItemRow {
  return {
    product_name: raw?.product_name ?? "",
    quantity_sold: raw?.quantity_sold ?? 0,
    net_cents: raw?.net_cents ?? 0,
    net_formatted: raw?.net_formatted ?? "",
  };
}

function buildRangeQuery(params: ReportRangeParams): URLSearchParams {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  return qs;
}

export async function fetchSalesSummary(params: ReportRangeParams = {}): Promise<SalesSummary> {
  const qs = buildRangeQuery(params).toString();
  const raw = await api.get<Partial<SalesSummary>>(
    `/merchant/reports/sales-summary${qs ? `?${qs}` : ""}`,
  );
  return normalizeSummary(raw);
}

export async function fetchSalesByDay(params: ReportRangeParams = {}): Promise<SalesByDayResponse> {
  const qs = buildRangeQuery(params).toString();
  const raw = await api.get<Partial<SalesByDayResponse>>(
    `/merchant/reports/sales-by-day${qs ? `?${qs}` : ""}`,
  );
  return { data: Array.isArray(raw.data) ? raw.data.map(normalizeDayRow) : [] };
}

export async function fetchTopItems(params: TopItemsParams = {}): Promise<TopItemsResponse> {
  const qs = buildRangeQuery(params);
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  const raw = await api.get<Partial<TopItemsResponse>>(
    `/merchant/reports/top-items${query ? `?${query}` : ""}`,
  );
  return { data: Array.isArray(raw.data) ? raw.data.map(normalizeTopItem) : [] };
}
