import { useQuery } from "@tanstack/react-query";
import { fetchMenu } from "./api";

export const menuQueryKey = ["pos", "menu"] as const;

/**
 * The menu barely changes mid-shift (a merchant edits their catalog rarely,
 * not while ringing up drinks) — a generous staleTime avoids refetching on
 * every focus/mount, and there's no polling: unlike the kitchen queue, a
 * stale product list for a few minutes doesn't put a drink at risk the way
 * a stale order queue would.
 */
export function useMenu() {
  return useQuery({
    queryKey: menuQueryKey,
    queryFn: fetchMenu,
    staleTime: 5 * 60_000,
  });
}
