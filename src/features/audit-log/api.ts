import { api } from "@/lib/api/client";
import type { AuditLogActor, AuditLogEntry, AuditLogFilters, AuditLogPage } from "./types";

/**
 * Parsers stay additive-tolerant, matching orders/api.ts's convention: extra
 * keys pass through untouched, and fields that would crash a render if
 * missing are normalized defensively here.
 */

function normalizeActor(raw: Partial<AuditLogActor> | null | undefined): AuditLogActor {
  return {
    id: raw?.id ?? 0,
    name: raw?.name ?? "",
    email: raw?.email ?? "",
  };
}

function normalizeEntry(raw: Partial<AuditLogEntry> | null | undefined): AuditLogEntry {
  return {
    id: raw?.id ?? 0,
    actor: normalizeActor(raw?.actor),
    action: raw?.action ?? "",
    subject_type: raw?.subject_type ?? "",
    subject_id: raw?.subject_id ?? 0,
    old_values: raw?.old_values ?? null,
    new_values: raw?.new_values ?? null,
    context: raw?.context ?? null,
    ip_address: raw?.ip_address ?? null,
    created_at: raw?.created_at ?? "",
  };
}

function buildQuery(filters: AuditLogFilters): string {
  const params = new URLSearchParams();
  if (filters.action) params.set("action", filters.action);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.perPage) params.set("per_page", String(filters.perPage));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogPage> {
  const raw = await api.get<Partial<AuditLogPage>>(`/merchant/audit-log${buildQuery(filters)}`);
  return {
    data: Array.isArray(raw.data) ? raw.data.map(normalizeEntry) : [],
    links: {
      first: raw.links?.first ?? null,
      last: raw.links?.last ?? null,
      prev: raw.links?.prev ?? null,
      next: raw.links?.next ?? null,
    },
    meta: {
      current_page: raw.meta?.current_page ?? 1,
      from: raw.meta?.from ?? null,
      last_page: raw.meta?.last_page ?? 1,
      links: Array.isArray(raw.meta?.links) ? raw.meta.links : [],
      path: raw.meta?.path ?? "",
      per_page: raw.meta?.per_page ?? 0,
      to: raw.meta?.to ?? null,
      total: raw.meta?.total ?? 0,
    },
  };
}
