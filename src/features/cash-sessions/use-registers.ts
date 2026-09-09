import { useQuery } from "@tanstack/react-query";
import { fetchRegisters } from "./api";

export const registersQueryKey = ["cash-sessions", "registers"] as const;

/**
 * Registers barely change (a merchant sets them up once) — a generous
 * staleTime avoids refetching every time the cash-drawer screen mounts, matching
 * the reasoning in features/pos/use-menu.ts.
 */
export function useRegisters() {
  return useQuery({
    queryKey: registersQueryKey,
    queryFn: fetchRegisters,
    staleTime: 5 * 60_000,
  });
}
