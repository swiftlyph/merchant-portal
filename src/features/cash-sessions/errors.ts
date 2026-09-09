import { ApiError } from "@/lib/api/client";
import { formatCents } from "@/lib/money";

/**
 * Cash-session error codes get plain-language, cashier-readable messages —
 * a 409/422/403 here means real money and a live shift, not a form retry.
 * Falls back to the server's own message for anything unrecognized, since
 * that text is still meant for a human.
 */

/** True when opening failed only because another device just opened this register's cash drawer first. */
export function isSessionAlreadyOpen(error: unknown): boolean {
  return error instanceof ApiError && error.code === "session_already_open";
}

export function describeOpenSessionError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "session_already_open") {
      return "This register's cash drawer is already open — refreshing to show the current session.";
    }
    if (error.code === "no_register_configured") {
      return "This merchant has no active register configured. Contact your admin.";
    }
    return error.message || "Couldn't open the cash drawer.";
  }
  return error instanceof Error ? error.message : "Couldn't open the cash drawer.";
}

export function describeMovementError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "session_closed") {
      return "This cash drawer is already closed — refresh the page to see its final figures.";
    }
    return error.message || "Couldn't record that movement.";
  }
  return error instanceof Error ? error.message : "Couldn't record that movement.";
}

/**
 * `error.errors?.max_cents` is not a real field the backend sends — the
 * message alone is expected to name the maximum, since remittance_exceeds_cash
 * doesn't carry a structured limit today. If that ever changes, prefer a
 * structured value over parsing the message.
 */
export function describeRemittanceError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "remittance_exceeds_cash") {
      return error.message || "That amount is more than the cash currently expected on hand.";
    }
    if (error.code === "session_closed") {
      return "This cash drawer is already closed — refresh the page to see its final figures.";
    }
    return error.message || "Couldn't record that remittance.";
  }
  return error instanceof Error ? error.message : "Couldn't record that remittance.";
}

export function describeConfirmError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "confirmation_requires_second_user") {
      return "A different user must confirm this remittance — that's a deliberate control, not a bug. Ask a teammate to confirm it.";
    }
    if (error.code === "remittance_already_confirmed") {
      return "This remittance was already confirmed.";
    }
    if (error.code === "session_closed") {
      return "This cash drawer is already closed — refresh the page to see its final figures.";
    }
    return error.message || "Couldn't confirm this remittance.";
  }
  return error instanceof Error ? error.message : "Couldn't confirm this remittance.";
}

export function describeCloseError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "session_closed") {
      return "This cash drawer was already closed — refreshing to show the final figures.";
    }
    return error.message || "Couldn't close the cash drawer.";
  }
  return error instanceof Error ? error.message : "Couldn't close the cash drawer.";
}

/** True when close failed only because the session was already closed (e.g. a double-submit race). */
export function isSessionClosed(error: unknown): boolean {
  return error instanceof ApiError && error.code === "session_closed";
}

/** "over"/"short"/"exact" label for a variance in cents, plus its display string with no sign on "exact". */
export function describeVariance(varianceCents: number): { label: "over" | "short" | "exact"; text: string } {
  if (varianceCents === 0) return { label: "exact", text: "Exact" };
  if (varianceCents > 0) return { label: "over", text: `${formatCents(varianceCents)} over` };
  return { label: "short", text: `${formatCents(-varianceCents)} short` };
}
