import { useQuery } from "@tanstack/react-query";
import { fetchOrder } from "./api";
import { ApiError } from "@/lib/api/client";

export const orderQueryKey = (id: string) => ["orders", "detail", id] as const;

/** Single order for /app/orders/:id. A 404 (unknown or foreign id) is not retried. */
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderQueryKey(id),
    queryFn: () => fetchOrder(id),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 1;
    },
  });
}
