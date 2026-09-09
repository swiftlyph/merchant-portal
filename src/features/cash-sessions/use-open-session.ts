import { useMutation, useQueryClient } from "@tanstack/react-query";
import { openSession } from "./api";
import type { OpenCashSessionRequest } from "./types";

/**
 * Opening is idempotent from the UI's point of view even though the
 * endpoint isn't: a 409 session_already_open means another device (or
 * another tab) just opened this register's cash drawer a moment before
 * this request landed — not a failure to show the cashier, just a sign
 * the cached "current session" is stale. Callers should catch that in
 * their error handler and refetch current rather than rendering the raw
 * error; see the cash-drawer page for that branch.
 */
export function useOpenSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: OpenCashSessionRequest) => openSession(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cash-sessions", "current"] });
      void queryClient.invalidateQueries({ queryKey: ["cash-sessions", "history"] });
    },
  });
}
