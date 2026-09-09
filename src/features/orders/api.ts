import { api } from "@/lib/api/client";
import type { Order, OrderAddOn, OrderItem, OrdersFilters, OrdersPage } from "./types";

/**
 * Parsers stay additive-tolerant: extra keys the backend adds later pass
 * through untouched (TypeScript's structural typing already allows that),
 * and fields that would otherwise crash a render if missing/malformed
 * (arrays, nullable cash/gcash split) are normalized defensively here so a
 * partial or evolving payload degrades instead of throwing.
 */

function normalizeAddOn(raw: Partial<OrderAddOn> | null | undefined): OrderAddOn {
  return {
    id: raw?.id ?? 0,
    name: raw?.name ?? "",
    price_cents: raw?.price_cents ?? 0,
    price_formatted: raw?.price_formatted ?? "",
  };
}

function normalizeItem(raw: Partial<OrderItem> | null | undefined): OrderItem {
  return {
    id: raw?.id ?? 0,
    product_id: raw?.product_id ?? null,
    product_name: raw?.product_name ?? "",
    unit_price_cents: raw?.unit_price_cents ?? 0,
    unit_price_formatted: raw?.unit_price_formatted ?? "",
    quantity: raw?.quantity ?? 0,
    line_total_cents: raw?.line_total_cents ?? 0,
    line_total_formatted: raw?.line_total_formatted ?? "",
    add_ons: Array.isArray(raw?.add_ons) ? raw.add_ons.map(normalizeAddOn) : [],
  };
}

function normalizeOrder(raw: Partial<Order> | null | undefined): Order {
  return {
    id: raw?.id ?? 0,
    order_number: raw?.order_number ?? "",
    status: raw?.status ?? "pending",
    currency: raw?.currency ?? "PHP",
    subtotal_cents: raw?.subtotal_cents ?? 0,
    subtotal_formatted: raw?.subtotal_formatted ?? "",
    discount_cents: raw?.discount_cents ?? 0,
    discount_formatted: raw?.discount_formatted ?? "",
    total_cents: raw?.total_cents ?? 0,
    total_formatted: raw?.total_formatted ?? "",
    payment_method: raw?.payment_method ?? "cash",
    cash_cents: raw?.cash_cents ?? null,
    cash_formatted: raw?.cash_formatted ?? null,
    gcash_cents: raw?.gcash_cents ?? null,
    gcash_formatted: raw?.gcash_formatted ?? null,
    created_by_user_id: raw?.created_by_user_id ?? 0,
    voided_by_user_id: raw?.voided_by_user_id ?? null,
    completed_at: raw?.completed_at ?? null,
    voided_at: raw?.voided_at ?? null,
    created_at: raw?.created_at ?? "",
    updated_at: raw?.updated_at ?? "",
    items: Array.isArray(raw?.items) ? raw.items.map(normalizeItem) : [],
  };
}

function buildQuery(filters: OrdersFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.date) params.set("date", filters.date);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.perPage) params.set("per_page", String(filters.perPage));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchOrders(filters: OrdersFilters = {}): Promise<OrdersPage> {
  const raw = await api.get<Partial<OrdersPage>>(`/merchant/orders${buildQuery(filters)}`);
  return {
    data: Array.isArray(raw.data) ? raw.data.map(normalizeOrder) : [],
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

export async function fetchOrder(id: number | string): Promise<Order> {
  const raw = await api.get<Partial<Order>>(`/merchant/orders/${id}`);
  return normalizeOrder(raw);
}

export function completeOrder(id: number | string): Promise<Order> {
  return api.post<Order>(`/merchant/orders/${id}/complete`).then(normalizeOrder);
}

export function voidOrder(id: number | string): Promise<Order> {
  return api.post<Order>(`/merchant/orders/${id}/void`).then(normalizeOrder);
}
