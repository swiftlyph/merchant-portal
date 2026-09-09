import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordMovement } from "./api";
import type { RecordMovementRequest } from "./types";

/**
 * Recording cash in/out changes the session's live reconciliation figures
 * (cash_in_cents/cash_out_cents feed straight into expected_cash_cents),
 * so the current-session query must be invalidated — the movements list
 * shown on the cash-drawer page comes from that same query (current is
 * loaded with movements/remittances), not a separate fetch.
 */
export function useRecordMovement(sessionId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RecordMovementRequest) => recordMovement(sessionId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cash-sessions", "current"] });
      void queryClient.invalidateQueries({
        queryKey: ["cash-sessions", "detail", String(sessionId)],
      });
    },
  });
}
