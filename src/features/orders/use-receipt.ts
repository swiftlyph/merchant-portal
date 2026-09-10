import { useQuery } from "@tanstack/react-query";
import { fetchReceipt } from "./api";
import { ApiError } from "@/lib/api/client";

export const receiptQueryKey = (id: string) => ["orders", "receipt", id] as const;

/** Receipt payload for /app/orders/:id/receipt. A 404 is not retried. */
export function useReceipt(id: string) {
  return useQuery({
    queryKey: receiptQueryKey(id),
    queryFn: () => fetchReceipt(id),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 1;
    },
  });
}
