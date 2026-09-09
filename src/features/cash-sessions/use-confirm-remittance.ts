import { useMutation, useQueryClient } from "@tanstack/react-query";
import { confirmRemittance } from "./api";

/**
 * Confirming a remittance drops expected cash by its amount — the whole
 * reason this mutation must invalidate the current-session query rather
 * than just patch the remittance's own status locally.
 */
export function useConfirmRemittance(sessionId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (remittanceId: number | string) => confirmRemittance(remittanceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cash-sessions", "current"] });
      void queryClient.invalidateQueries({
        queryKey: ["cash-sessions", "detail", String(sessionId)],
      });
    },
  });
}
