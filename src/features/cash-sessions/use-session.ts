import { useQuery } from "@tanstack/react-query";
import { fetchSession } from "./api";
import { ApiError } from "@/lib/api/client";

export const sessionQueryKey = (id: string) => ["cash-sessions", "detail", id] as const;

/** Single session for /app/cash-drawer/sessions/:id. A 404 (unknown or foreign id) is not retried. */
export function useSession(id: string) {
  return useQuery({
    queryKey: sessionQueryKey(id),
    queryFn: () => fetchSession(id),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 1;
    },
  });
}
