import { useQuery } from "@tanstack/react-query";
import { fetchSalesSummary } from "./api";
import type { ReportRangeParams } from "./types";

export const salesSummaryQueryKey = (range: ReportRangeParams) =>
  ["reports", "sales-summary", range] as const;

/**
 * Summary cards + payment-method breakdown for /app/reports, and the
 * dashboard revenue card. `enabled` lets the reports page skip the request
 * entirely for a range already known client-side to exceed the server's cap
 * (see date-range.ts's isRangeWithinLimit) — defaults to true for every
 * other caller.
 */
export function useSalesSummary(range: ReportRangeParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: salesSummaryQueryKey(range),
    queryFn: () => fetchSalesSummary(range),
    enabled: options?.enabled,
  });
}
