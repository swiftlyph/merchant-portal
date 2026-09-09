import { useQuery } from "@tanstack/react-query";
import { fetchCurrentSession } from "./api";

export const currentSessionQueryKey = (registerId?: number) =>
  ["cash-sessions", "current", registerId ?? null] as const;

/**
 * The open session for a register (or the merchant's default) WITH its
 * live reconciliation figures. `data` is `null` when nothing is open —
 * that's a normal, successful response (200), never an error state.
 * `placeholderData` keeps the last-known figures on screen across a
 * register switch or background refetch instead of flashing a skeleton —
 * see rule 10 (never blank the money panel on a refetch).
 */
export function useCurrentSession(registerId?: number) {
  return useQuery({
    queryKey: currentSessionQueryKey(registerId),
    queryFn: () => fetchCurrentSession(registerId),
    placeholderData: (previousData) => previousData,
  });
}
