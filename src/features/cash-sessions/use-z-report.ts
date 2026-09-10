import { useQuery } from "@tanstack/react-query";
import { fetchZReport } from "./api";
import { ApiError } from "@/lib/api/client";

export const zReportQueryKey = (id: string) => ["cash-sessions", "z-report", id] as const;

/** Z-report payload for /app/cash-drawer/sessions/:id/report. A 404 is not retried. */
export function useZReport(id: string) {
  return useQuery({
    queryKey: zReportQueryKey(id),
    queryFn: () => fetchZReport(id),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 1;
    },
  });
}
