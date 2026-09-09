import { useMutation, useQueryClient } from "@tanstack/react-query";
import { closeSession } from "./api";
import type { CloseCashSessionRequest } from "./types";

/**
 * Closing freezes expected/counted/variance on the session row and flips
 * it out of "current" — both the current-session query and the history
 * list need invalidating so the cash-drawer screen shows "no open
 * session" and the newly closed session appears in history immediately.
 */
export function useCloseSession(sessionId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CloseCashSessionRequest) => closeSession(sessionId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cash-sessions", "current"] });
      void queryClient.invalidateQueries({ queryKey: ["cash-sessions", "history"] });
      void queryClient.invalidateQueries({
        queryKey: ["cash-sessions", "detail", String(sessionId)],
      });
    },
  });
}
