import type { CartLine } from "./cart-types";

/**
 * Client-side cart math, FOR DISPLAY ONLY. Integer cents throughout — never
 * floats, never toFixed on a divided value (see src/lib/money.ts). The
 * server recomputes every one of these numbers authoritatively at checkout
 * (it looks up its own product prices; it never trusts anything sent from
 * here) and its numbers win. This exists purely so the cashier sees a
 * running total before committing to a charge.
 */

/**
 * F13/P10: the FLAT 20%-off estimate used for a beneficiary line's live
 * "estimated" figure in the cart, deliberately simpler than the real
 * server formula (App\Domains\Orders\Support\StatutoryTax) — this is
 * shown next to a line WHILE the cashier is still assembling the order,
 * to give a rough sense of the savings, and is NEVER what gets charged.
 *
 * Why not replicate the server's VAT-aware math here: the real formula
 * needs the merchant's VAT-registration status AND the exact VAT rate,
 * neither of which the POS has on hand mid-cart-build (the merchant
 * profile isn't loaded into this feature, and duplicating the rate would
 * create a second place a rate change could drift out of sync with the
 * server's config — exactly what StatutoryTax's docblock in the backend
 * warns against). A flat 20% is close enough to keep the cashier oriented
 * and impossible to mistake for a precise figure once it's labelled
 * "estimated" in the UI — the server's is the only number that is ever
 * actually charged (see CartPanel/SuccessDialog for where "estimated" is
 * shown alongside this and where it is discarded once a real order comes
 * back).
 */
export const ESTIMATED_STATUTORY_DISCOUNT_RATE = 0.2;

export function lineTotalCents(line: CartLine): number {
  const addOnsCents = line.add_ons.reduce((sum, addOn) => sum + addOn.price_cents, 0);
  return (line.unit_price_cents + addOnsCents) * line.quantity;
}

/** F13/P10: this line's rough, client-side-only discount estimate — 0 for a line with no beneficiary assigned. See ESTIMATED_STATUTORY_DISCOUNT_RATE's docblock for why this is intentionally NOT the server's exact formula. */
export function estimatedLineDiscountCents(line: CartLine): number {
  if (!line.beneficiaryLocalId) return 0;
  return Math.round(lineTotalCents(line) * ESTIMATED_STATUTORY_DISCOUNT_RATE);
}

/** F13/P10: the rough, client-side-only total of every assigned line's estimated discount — never sent to the server and never used to compute `total_cents` (see totalCents below, which stays server-agnostic and pre-P10 in shape: subtotal minus the promo discount only). */
export function estimatedStatutoryDiscountCents(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + estimatedLineDiscountCents(line), 0);
}

export function subtotalCents(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
}

/**
 * The promo-discount-only total, UNCHANGED from before F13/P10 — still
 * just subtotal minus the typed-in discount. Deliberately does NOT
 * subtract the statutory estimate: that number is a rough, separately
 * labelled figure for the cashier's benefit, and folding it into the
 * headline total here would let an approximation quietly stand in for
 * the server's authoritative charge (see PaymentDialog, which is the one
 * screen that shows this figure as "the total to read aloud").
 */
export function totalCents(lines: CartLine[], discount_cents: number): number {
  return Math.max(0, subtotalCents(lines) - discount_cents);
}

export function itemCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Split-payment remainder: total - (cash + gcash so far). 0 means it exactly balances. */
export function splitRemainderCents(
  total_cents: number,
  cash_cents: number,
  gcash_cents: number,
): number {
  return total_cents - cash_cents - gcash_cents;
}
