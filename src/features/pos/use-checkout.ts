import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { checkout } from "./api";
import type { CartBeneficiary, CartLine } from "./cart-types";
import type { CheckoutRequest, CheckoutResponse, PaymentMethod } from "./types";

/**
 * A stable fingerprint of "the basket this key was minted for" — cheap
 * deep-equality via JSON, which is fine here since a checkout request body
 * is small and this only runs on user-driven cart/payment edits, never in
 * a hot loop.
 *
 * F13/P10: NOTHING about this function changed for beneficiaries, and
 * that's the point — `beneficiaries`/`items[*].beneficiary` are just more
 * fields on the SAME `CheckoutRequest` object this already stringifies,
 * so adding, editing, or removing a beneficiary (or moving a line between
 * two of them) changes the JSON exactly like an edited quantity or a
 * different discount always has, and useCheckout's existing "basket
 * changed => mint a new key" rule (see its own docblock below) picks that
 * up automatically. This mirrors the backend's own fingerprint, which
 * folds beneficiaries into the SAME hash for the SAME reason (see
 * App\Domains\Orders\Support\CheckoutFingerprint) — the two must agree on
 * what counts as "a different request", or a client-side key rotation
 * could still collide with the server's 409 idempotency_key_reuse.
 */
function fingerprint(request: CheckoutRequest): string {
  return JSON.stringify(request);
}

export function linesToCheckoutRequest(
  lines: CartLine[],
  payment_method: PaymentMethod,
  discount_cents: number,
  split?: { cash_cents: number; gcash_cents: number },
  beneficiaries: CartBeneficiary[] = [],
): CheckoutRequest {
  // A line's beneficiaryLocalId is resolved to its POSITION in
  // `beneficiaries` here — the request's `items[*].beneficiary` is an
  // INDEX (see CheckoutItem's docblock), never the cart's own localId,
  // which the server has no way to interpret.
  const indexByLocalId = new Map(beneficiaries.map((b, index) => [b.localId, index]));

  return {
    payment_method,
    ...(payment_method === "split" && split
      ? { cash_cents: split.cash_cents, gcash_cents: split.gcash_cents }
      : {}),
    discount_cents,
    ...(beneficiaries.length > 0
      ? {
          beneficiaries: beneficiaries.map((b) => ({
            type: b.type,
            name: b.name,
            id_number: b.id_number,
          })),
        }
      : {}),
    items: lines.map((line) => {
      const beneficiaryIndex = line.beneficiaryLocalId
        ? indexByLocalId.get(line.beneficiaryLocalId)
        : undefined;
      return {
        product_id: line.product_id,
        quantity: line.quantity,
        ...(beneficiaryIndex !== undefined ? { beneficiary: beneficiaryIndex } : {}),
        ...(line.add_ons.length > 0
          ? { add_ons: line.add_ons.map((a) => ({ name: a.name, price_cents: a.price_cents })) }
          : {}),
      };
    }),
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
