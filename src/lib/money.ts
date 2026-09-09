/**
 * Money helpers shared by every screen that renders order/payment amounts.
 * The backend sends integer cents for every money field — never format from
 * a divided float (cents / 100 then toFixed loses cents to binary rounding
 * on some values). Intl.NumberFormat works directly off a major-unit number,
 * so cents are divided only right at the formatting boundary, in integer-safe
 * arithmetic, never accumulated or compared as a float elsewhere.
 *
 * Prefer the API's own `*_formatted` string where one is provided (the
 * orders endpoints ship one alongside every `*_cents` field, rendered
 * server-side by the same code that formats receipts and kitchen tickets)
 * — this helper is the fallback for a cents value with no formatted twin,
 * and for tests that build fixtures without going through the API layer.
 */

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    });
    formatters.set(currency, formatter);
  }
  return formatter;
}

/** Formats integer cents (e.g. 15000) into a display string (e.g. "₱150.00"). */
export function formatCents(cents: number, currency = "PHP"): string {
  return formatterFor(currency).format(cents / 100);
}
