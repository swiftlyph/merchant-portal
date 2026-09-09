import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "./api";

export const meQueryKey = ["auth", "me"] as const;

/**
 * The one live, authenticated request a signed-in page can make today. It
 * exists as much to prove the token still works as to fetch the user: if the
 * token was revoked server-side, this 401s like any other protected call and
 * goes through the normal registerOnUnauthorized path (session.ts) — no
 * separate "am I still logged in" mechanism needed.
 *
 * staleTime: Infinity — this fetches once per session, never polls or
 * refetches on window focus (global default already covers the latter).
 */
export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: () => fetchMe(),
    staleTime: Infinity,
  });
}
