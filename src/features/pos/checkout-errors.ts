import { ApiError } from "@/lib/api/client";

/**
 * Every checkout failure path gets a cashier-readable message — someone
 * mid-transaction with a customer waiting needs to know what to DO, not
 * just that something failed. Falls back to the server's own message for
 * anything not explicitly handled here (validation_failed field errors,
 * unrecognized codes), since that message is still meant to be read by a
 * human.
 */
export interface CheckoutErrorInfo {
  message: string;
  /** Product ids the server rejected — the cart UI can flag them, if it chooses to. */
  unavailableProductIds?: string[];
  /** True when the fix is "generate a new key and retry" rather than "just retry". */
  requiresNewKey: boolean;
  /** True when the safe, correct action is to retry the SAME request (same key) — a network failure is exactly the case idempotency exists for. */
  canRetrySameKey: boolean;
}

export function describeCheckoutError(error: unknown): CheckoutErrorInfo {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return {
        message: "Couldn't reach the server. Check the connection and retry — it's safe to retry, nothing was charged twice.",
        requiresNewKey: false,
        canRetrySameKey: true,
      };
    }

    switch (error.code) {
      case "product_unavailable":
        return {
          message: "Some items are no longer available and were removed from what can be charged. Update the cart and retry.",
          unavailableProductIds: error.errors?.product_ids,
          requiresNewKey: false,
          canRetrySameKey: false,
        };
      case "discount_exceeds_subtotal":
        return {
          message: "The discount is larger than the subtotal. Lower the discount and retry.",
          requiresNewKey: false,
          canRetrySameKey: false,
        };
      case "split_mismatch":
        return {
          message: "Cash + GCash doesn't add up to the total. Fix the split amounts and retry.",
          requiresNewKey: false,
          canRetrySameKey: false,
        };
      case "validation_failed":
        return {
          message: error.message || "Some details are invalid. Check the order and retry.",
          requiresNewKey: false,
          canRetrySameKey: false,
        };
      case "idempotency_key_reuse":
        return {
          message: "This basket changed since the last attempt. Retrying with a fresh request.",
          requiresNewKey: true,
          canRetrySameKey: false,
        };
      case "merchant_inactive":
        return {
          message: "This merchant account is no longer active. Contact your admin.",
          requiresNewKey: false,
          canRetrySameKey: false,
        };
      default:
        return { message: error.message || "Couldn't complete the charge.", requiresNewKey: false, canRetrySameKey: false };
    }
  }

  return {
    message: error instanceof Error ? error.message : "Couldn't complete the charge.",
    requiresNewKey: false,
    canRetrySameKey: false,
  };
}
