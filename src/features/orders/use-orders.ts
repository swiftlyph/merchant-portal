import { useQuery } from "@tanstack/react-query";
import { fetchOrders } from "./api";
import type { OrdersFilters } from "./types";

export const ordersQueryKey = (filters: OrdersFilters) => ["orders", "list", filters] as const;

/** Orders list for /app/orders, filtered by status/date and server-paginated. */
export function useOrders(filters: OrdersFilters) {
  return useQuery({
    queryKey: ordersQueryKey(filters),
    queryFn: () => fetchOrders(filters),
    placeholderData: (previousData) => previousData,
  });
}
