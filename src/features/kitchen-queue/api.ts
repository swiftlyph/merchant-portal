import { api } from "@/lib/api/client";
import type {
  KitchenOrder,
  KitchenOrderItem,
  KitchenQueueFilters,
  KitchenQueueResponse,
  KitchenQueueSummary,
} from "./types";

/**
 * Parsers stay additive-tolerant: extra keys the backend adds later pass
 * through untouched, and fields that would otherwise crash a render if
 * missing/malformed are normalized defensively here — see the orders
 * feature's api.ts for the same convention.
 */

function normalizeItem(raw: Partial<KitchenOrderItem> | null | undefined): KitchenOrderItem {
  return {
    id: raw?.id ?? 0,
    product_name: raw?.product_name ?? "",
    quantity: raw?.quantity ?? 0,
    add_ons: Array.isArray(raw?.add_ons) ? raw.add_ons.filter((a) => typeof a === "string") : [],
  };
}

function normalizeOrder(raw: Partial<KitchenOrder> | null | undefined): KitchenOrder {
  return {
    id: raw?.id ?? 0,
    order_number: raw?.order_number ?? "",
    created_at: raw?.created_at ?? "",
    waiting_seconds: raw?.waiting_seconds ?? 0,
    items: Array.isArray(raw?.items) ? raw.items.map(normalizeItem) : [],
  };
}

function buildQuery(filters: KitchenQueueFilters): string {
  const params = new URLSearchParams();
  if (filters.all) params.set("all", "1");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * GET /merchant/kitchen-queue — unpaginated, capped at 200, oldest first.
 * No `links`/`meta`: this is NOT the orders list's pagination envelope,
 * just `{ data: [...] }`.
 */
export async function fetchKitchenQueue(
  filters: KitchenQueueFilters = {},
): Promise<KitchenQueueResponse> {
  const raw = await api.get<Partial<KitchenQueueResponse>>(
    `/merchant/kitchen-queue${buildQuery(filters)}`,
  );
  return {
    data: Array.isArray(raw.data) ? raw.data.map(normalizeOrder) : [],
  };
}

/**
 * GET /merchant/kitchen-queue/summary — a FLAT object, no `data` wrapper.
 */
export async function fetchKitchenQueueSummary(
  filters: KitchenQueueFilters = {},
): Promise<KitchenQueueSummary> {
  const raw = await api.get<Partial<KitchenQueueSummary>>(
    `/merchant/kitchen-queue/summary${buildQuery(filters)}`,
  );
  return {
    pending_count: raw.pending_count ?? 0,
    oldest_waiting_seconds: raw.oldest_waiting_seconds ?? null,
  };
}
