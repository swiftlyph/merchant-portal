import { useQuery } from "@tanstack/react-query";
import { fetchSessionHistory } from "./api";
import type { CashSessionsFilters } from "./types";

export const sessionHistoryQueryKey = (filters: CashSessionsFilters) =>
  ["cash-sessions", "history", filters] as const;

/** Past-sessions list for /app/cash-drawer, filtered and server-paginated. */
export function useSessionHistory(filters: CashSessionsFilters) {
  return useQuery({
    queryKey: sessionHistoryQueryKey(filters),
    queryFn: () => fetchSessionHistory(filters),
    placeholderData: (previousData) => previousData,
  });
}
