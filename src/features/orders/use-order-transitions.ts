import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { completeOrder, voidOrder } from "./api";
import { orderQueryKey } from "./use-order";
import { ApiError } from "@/lib/api/client";

/**
 * Two tablets can both be looking at the same pending order in a coffee
 * shop — one completes it a beat before the other voids it. That second
 * call gets a real 422 invalid_transition, not a hypothetical: it's not an
 * error to surface as a form field problem, it's "someone else already
 * moved this order" — a toast plus a refetch so the UI catches up to
 * whatever state actually won.
 */
function handleInvalidTransition(error: unknown, queryClient: ReturnType<typeof useQueryClient>, id: number | string) {
  if (error instanceof ApiError && error.code === "invalid_transition") {
    toast.error("This order already changed status.", {
      description: "Refreshing to show the current state.",
    });
    void queryClient.invalidateQueries({ queryKey: orderQueryKey(String(id)) });
    void queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
    return true;
  }
  return false;
}

export function useCompleteOrder(id: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => completeOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderQueryKey(String(id)) });
      void queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
    },
    onError: (error) => {
      handleInvalidTransition(error, queryClient, id);
    },
  });
}

export function useVoidOrder(id: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => voidOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderQueryKey(String(id)) });
      void queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
    },
    onError: (error) => {
      handleInvalidTransition(error, queryClient, id);
    },
  });
}
