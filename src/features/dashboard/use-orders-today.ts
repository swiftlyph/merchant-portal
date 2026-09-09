import { useOrders } from "@/features/orders/use-orders";
import { todayDateParam } from "./today";

/**
 * The "Orders today" stat: reuses useOrders/fetchOrders (never a separate
 * fetch) filtered to today's date, and reads ONLY meta.total from the
 * paginator — a single request, regardless of how many orders exist today.
 * per_page: 1 keeps the payload minimal; the row itself is never rendered
 * from this hook, only the count.
 */
export function useOrdersToday() {
  const query = useOrders({ date: todayDateParam(), perPage: 1, page: 1 });
  return {
    total: query.data?.meta.total,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
