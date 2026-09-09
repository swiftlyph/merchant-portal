import type { CartLine } from "./cart-types";

/**
 * Client-side cart math, FOR DISPLAY ONLY. Integer cents throughout — never
 * floats, never toFixed on a divided value (see src/lib/money.ts). The
 * server recomputes every one of these numbers authoritatively at checkout
 * (it looks up its own product prices; it never trusts anything sent from
 * here) and its numbers win. This exists purely so the cashier sees a
 * running total before committing to a charge.
 */

export function lineTotalCents(line: CartLine): number {
  const addOnsCents = line.add_ons.reduce((sum, addOn) => sum + addOn.price_cents, 0);
  return (line.unit_price_cents + addOnsCents) * line.quantity;
}

export function subtotalCents(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
}

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
