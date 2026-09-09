import type { CashMovementType, RemittanceStatus } from "./types";

export const MOVEMENT_TYPE_LABEL: Record<CashMovementType, string> = {
  cash_in: "Cash in",
  cash_out: "Cash out",
};

export const REMITTANCE_STATUS_LABEL: Record<RemittanceStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
};

/** e.g. "Sep 9, 2026, 2:30 PM" — matches src/features/orders/format.ts exactly. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
