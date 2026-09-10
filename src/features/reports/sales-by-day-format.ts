import { formatCents } from "@/lib/money";
import type { SalesByDayRow } from "./types";

/**
 * Y-axis tick label only. This divides cents by 100 purely for display —
 * the same display-scaling the API's own *_formatted strings represent, not
 * money arithmetic — so it's fine here even though the rest of the app never
 * divides a *_cents value client-side (see money.ts). Nothing derived from
 * this feeds back into a displayed money amount; the bars and tooltip still
 * plot/read straight from net_cents and net_formatted.
 */
export function formatCentsAxisTick(cents: number): string {
  return formatCents(cents);
}

/** Tooltip amount: prefer the row's own formatted string, else the same formatter. */
export function tooltipAmountFor(row: Pick<SalesByDayRow, "net_cents" | "net_formatted">): string {
  return row.net_formatted || formatCentsAxisTick(row.net_cents);
}
