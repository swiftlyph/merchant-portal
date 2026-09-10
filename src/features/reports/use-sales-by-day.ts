import { useQuery } from "@tanstack/react-query";
import { fetchSalesByDay } from "./api";
import type { ReportRangeParams } from "./types";

export const salesByDayQueryKey = (range: ReportRangeParams) =>
  ["reports", "sales-by-day", range] as const;

/**
 * Sales-by-day chart + table fallback for /app/reports. Same `range` as
 * useSalesSummary/useTopItems; `enabled` mirrors useSalesSummary's.
 */
export function useSalesByDay(range: ReportRangeParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: salesByDayQueryKey(range),
    queryFn: () => fetchSalesByDay(range),
    enabled: options?.enabled,
  });
}
