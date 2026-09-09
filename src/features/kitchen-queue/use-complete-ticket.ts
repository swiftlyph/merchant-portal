import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCompleteOrder } from "@/features/orders/use-order-transitions";
import { ApiError } from "@/lib/api/client";

/**
 * Completing a kitchen ticket REUSES the orders feature's existing
 * complete mutation rather than duplicating it — there is no kitchen-
 * specific completion endpoint, and OrderStatus' transition map stays the
 * only authority on what a legal status change is (see the backend
 * KitchenQueueController docblock). This wraps it with the extra
 * invalidation and toast behaviour the kitchen screen needs, via the
 * mutation's own per-call onSuccess/onError — the shared hook's own
 * onSuccess/onError (invalidating orders list/detail) still runs too.
 *
 * On success: invalidate every kitchen-queue query (list AND summary, both
 * `all` variants) so the ticket disappears and the badge decrements
 * immediately rather than waiting for the next poll.
 *
 * On a 422 invalid_transition (another tablet completed the same order
 * first — a real two-tablet race, not hypothetical): toast, then
 * invalidate the queue/summary so the now-stale ticket is removed on
 * refetch. The base useCompleteOrder hook already toasts+refetches the
 * orders-feature queries for this case; this only adds the kitchen-queue
 * side so this screen doesn't leave a dead ticket on screen.
 */
export function useCompleteTicket(id: number | string) {
  const queryClient = useQueryClient();
  const mutation = useCompleteOrder(id);

  function invalidateKitchenQueries() {
    void queryClient.invalidateQueries({ queryKey: ["kitchen-queue"] });
  }

  function complete() {
    mutation.mutate(undefined, {
      onSuccess: () => {
        invalidateKitchenQueries();
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === "invalid_transition") {
          invalidateKitchenQueries();
        } else {
          toast.error(error instanceof Error ? error.message : "Couldn't complete this order.");
        }
      },
    });
  }

  return { complete, isPending: mutation.isPending };
}
