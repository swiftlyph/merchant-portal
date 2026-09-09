import type { PaymentMethod } from "./types";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  gcash: "GCash",
  split: "Split",
};

/** e.g. "Sep 9, 2026, 2:30 PM" — used for both list rows and detail timestamps. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
