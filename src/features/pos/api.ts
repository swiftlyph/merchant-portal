import { api } from "@/lib/api/client";
import type { CheckoutRequest, CheckoutResponse, MenuProduct, MenuResponse } from "./types";

/**
 * Parsers stay additive-tolerant: extra keys the backend adds later pass
 * through untouched, and fields that would otherwise crash a render if
 * missing/malformed are normalized defensively here — following the
 * convention in src/features/orders/api.ts.
 */
function normalizeProduct(raw: Partial<MenuProduct> | null | undefined): MenuProduct {
  return {
    id: raw?.id ?? 0,
    name: raw?.name ?? "",
    price_cents: raw?.price_cents ?? 0,
    price_formatted: raw?.price_formatted ?? "",
    currency: raw?.currency ?? "PHP",
    is_available: raw?.is_available ?? false,
  };
}

/**
 * The POS menu. Available items only — the register never shows something
 * a barista can't actually ring up.
 */
export async function fetchMenu(): Promise<MenuResponse> {
  const raw = await api.get<Partial<MenuResponse>>("/merchant/menu");
  return {
    data: Array.isArray(raw.data) ? raw.data.map(normalizeProduct) : [],
  };
}

/**
 * Checkout. `idempotencyKey` must be resent unchanged on any retry of the
 * SAME basket (network failure, timeout, a cashier pressing charge again)
 * — see use-checkout.ts for where the key is generated and rotated. The
 * server never trusts client-sent prices; only product_id + quantity (and,
 * for now, client-supplied add-on name/price) are sent.
 */
export function checkout(
  request: CheckoutRequest,
  idempotencyKey: string,
): Promise<CheckoutResponse> {
  return api.post<CheckoutResponse>("/merchant/orders", request, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
}
