/**
 * "Today" in the browser's LOCAL time, as "YYYY-MM-DD" — matching the
 * server's date_format:Y-m-d filter on GET /merchant/orders. Deliberately
 * not `new Date().toISOString().slice(0, 10)`: toISOString is UTC, which
 * would report "yesterday" or "tomorrow" for part of the day depending on
 * the merchant's timezone — wrong for a filter meant to mean "today, on
 * the counter, right now."
 */
export function todayDateParam(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
