/**
 * Waiting-time formatting and staleness thresholds for kitchen tickets.
 *
 * The server computes `waiting_seconds` once per response from its own
 * clock (see KitchenOrderResource) — this module only formats that number
 * and ticks it up locally BETWEEN polls from that server-given baseline.
 * Never derive elapsed time from `created_at` plus the browser's clock: a
 * kitchen tablet's clock can be minutes off, and a wrong "waiting 14
 * minutes" is worse than none, because it drives whether staff apologise
 * to a customer.
 */

export type WaitingStaleness = "normal" | "warning" | "urgent";

const WARNING_THRESHOLD_SECONDS = 5 * 60;
const URGENT_THRESHOLD_SECONDS = 10 * 60;

export function staleness(waitingSeconds: number): WaitingStaleness {
  if (waitingSeconds >= URGENT_THRESHOLD_SECONDS) return "urgent";
  if (waitingSeconds >= WARNING_THRESHOLD_SECONDS) return "warning";
  return "normal";
}

/** e.g. 90 -> "1m 30s", 45 -> "45s", 754 -> "12m 34s". */
export function formatWaitingTime(waitingSeconds: number): string {
  const clamped = Math.max(0, Math.floor(waitingSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}
