import { useQuery } from "@tanstack/react-query";
import { fetchKitchenQueue } from "./api";
import type { KitchenQueueFilters } from "./types";

export const kitchenQueueQueryKey = (filters: KitchenQueueFilters) =>
  ["kitchen-queue", "list", filters] as const;

/**
 * The queue itself. Polled every 15s per the backend README — a poll must
 * never blank the screen, so `placeholderData` keeps the previous list
 * visible while a refetch is in flight (the same pattern useOrders uses for
 * pagination, here serving the same "don't flash empty" purpose for polling
 * instead). Not paginated server-side — a barista cannot page through
 * drinks — so there is no page param to track.
 */
export function useKitchenQueue(filters: KitchenQueueFilters) {
  return useQuery({
    queryKey: kitchenQueueQueryKey(filters),
    queryFn: () => fetchKitchenQueue(filters),
    placeholderData: (previousData) => previousData,
    refetchInterval: 15_000,
  });
}
