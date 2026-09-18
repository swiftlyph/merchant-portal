import { useQuery } from "@tanstack/react-query";
import { fetchAuditLog } from "./api";
import type { AuditLogFilters } from "./types";

export const auditLogQueryKey = (filters: AuditLogFilters) =>
  ["audit-log", "list", filters] as const;

/** Audit trail list for /app/audit-log, filtered by action/date range and server-paginated. */
export function useAuditLog(filters: AuditLogFilters) {
  return useQuery({
    queryKey: auditLogQueryKey(filters),
    queryFn: () => fetchAuditLog(filters),
    placeholderData: (previousData) => previousData,
  });
}
