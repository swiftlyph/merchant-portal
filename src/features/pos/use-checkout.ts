import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { checkout } from "./api";
import type { CartLine } from "./cart-types";
import type { CheckoutRequest, CheckoutResponse, PaymentMethod } from "./types";

/**
 * A stable fingerprint of "the basket this key was minted for" — cheap
 * deep-equality via JSON, which is fine here since a checkout request body
 * is small and this only runs on user-driven cart/payment edits, never in
 * a hot loop.
 */
function fingerprint(request: CheckoutRequest): string {
  return JSON.stringify(request);
}

export function linesToCheckoutRequest(
  lines: CartLine[],
  payment_method: PaymentMethod,
  discount_cents: number,
  split?: { cash_cents: number; gcash_cents: number },
): CheckoutRequest {
  return {
    payment_method,
    ...(payment_method === "split" && split
      ? { cash_cents: split.cash_cents, gcash_cents: split.gcash_cents }
      : {}),
    discount_cents,
    items: lines.map((line) => ({
      product_id: line.product_id,
      quantity: line.quantity,
      ...(line.add_ons.length > 0
        ? { add_ons: line.add_ons.map((a) => ({ name: a.name, price_cents: a.price_cents })) }
        : {}),
    })),
  };
}

/**
 * Owns the idempotency key across an entire checkout ATTEMPT (one basket,
 * possibly several submit tries against it): the key is generated once,
 * the first time this basket is submitted, and resent unchanged on every
 * retry of that same basket — a network failure, a timeout, or a cashier
 * pressing charge again must never mint a fresh key, which would defeat
 * the whole mechanism and risk a double charge. It's only discarded
 * (forcing a fresh key next time) after:
 *   - a successful checkout (201, or a 200 idempotent replay), or
 *   - the basket actually changing since the key was minted — the server
 *     itself would reject a changed basket under a reused key with a 409
 *     idempotency_key_reuse, so this rotates ahead of that rather than
 *     ever hitting it in normal use.
 * A 422 (validation, product_unavailable, split_mismatch,
 * discount_exceeds_subtotal) does NOT burn the key: same basket, same key,
 * the cashier just fixes the payment amounts or removes a bad item and
 * retries.
 */
export function useCheckout() {
  const queryClient = useQueryClient();
  const keyRef = useRef<{ key: string; forBasket: string } | null>(null);

  const mutation = useMutation({
    mutationFn: (request: CheckoutRequest) => {
      const basket = fingerprint(request);
      if (!keyRef.current || keyRef.current.forBasket !== basket) {
        keyRef.current = { key: crypto.randomUUID(), forBasket: basket };
      }
      return checkout(request, keyRef.current.key);
    },
    onSuccess: () => {
      // The key's job is done — next checkout (a new order) must mint its own.
      keyRef.current = null;
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["kitchen-queue"] });
    },
  });

  return {
    charge: (request: CheckoutRequest) => mutation.mutateAsync(request),
    data: mutation.data as CheckoutResponse | undefined,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: () => {
      keyRef.current = null;
      mutation.reset();
    },
  };
}
