import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRemittance } from "./api";
import type { CreateRemittanceRequest } from "./types";

/**
 * A newly created remittance is "pending" and does NOT move expected cash
 * until confirmed — but the current-session query still needs invalidating
 * so the new pending row shows up in the remittances list right away.
 */
export function useCreateRemittance(sessionId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateRemittanceRequest) => createRemittance(sessionId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cash-sessions", "current"] });
      void queryClient.invalidateQueries({
        queryKey: ["cash-sessions", "detail", String(sessionId)],
      });
    },
  });
}
