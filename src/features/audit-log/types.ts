import type { PageLinks, PageMeta } from "@/features/orders/types";

/**
 * Mirrors App\Domains\Merchant\Http\Resources\MerchantAuditLogResource: a
 * flat row from GET /merchant/audit-log. `old_values`/`new_values`/`context`
 * are free-form JSON set by whichever backend Action wrote the entry (see
 * RecordMerchantAuditLogAction) — there is no fixed schema per action, so
 * they're rendered generically as key/value pairs rather than typed per
 * action name.
 */
export interface AuditLogActor {
  id: number;
  name: string;
  email: string;
}

export interface AuditLogEntry {
  id: number;
  actor: AuditLogActor;
  action: string;
  subject_type: string;
  subject_id: number;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogPage {
  data: AuditLogEntry[];
  links: PageLinks;
  meta: PageMeta;
}

export interface AuditLogFilters {
  action?: string;
  /** "YYYY-MM-DD", inclusive — validated server-side with date_format:Y-m-d. */
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}
