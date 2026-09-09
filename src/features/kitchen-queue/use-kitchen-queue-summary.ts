import { useQuery } from "@tanstack/react-query";
import { fetchKitchenQueueSummary } from "./api";
import type { KitchenQueueFilters } from "./types";

export const kitchenQueueSummaryQueryKey = (filters: KitchenQueueFilters) =>
  ["kitchen-queue", "summary", filters] as const;

/**
 * The sidebar-badge/header-count query — cheap on the server (a single
 * aggregate query, no rows hydrated) and polled independently of the full
 * queue, per the backend README's recommended 30s interval. Must be called
 * with the SAME `filters.all` value as useKitchenQueue wherever both are
 * used on one screen, so the badge and the list never describe different
 * sets of orders.
 */
export function useKitchenQueueSummary(filters: KitchenQueueFilters) {
  return useQuery({
    queryKey: kitchenQueueSummaryQueryKey(filters),
    queryFn: () => fetchKitchenQueueSummary(filters),
    placeholderData: (previousData) => previousData,
    refetchInterval: 30_000,
  });
}
