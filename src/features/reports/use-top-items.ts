import { useQuery } from "@tanstack/react-query";
import { fetchTopItems } from "./api";
import type { TopItemsParams } from "./types";

export const topItemsQueryKey = (params: TopItemsParams) =>
  ["reports", "top-items", params] as const;

/**
 * Top-items table for /app/reports. Shares `from`/`to` with
 * useSalesSummary/useSalesByDay; `limit` is local to this section.
 * `enabled` mirrors useSalesSummary's.
 */
export function useTopItems(params: TopItemsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: topItemsQueryKey(params),
    queryFn: () => fetchTopItems(params),
    enabled: options?.enabled,
  });
}
