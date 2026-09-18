import type { AuditLogEntry, AuditLogPage } from "./types";

export function makeAuditLogEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: 1,
    actor: { id: 1, name: "Jane Owner", email: "jane@merchantone.test" },
    action: "order.checked_out",
    subject_type: "App\\Domains\\Orders\\Models\\Order",
    subject_id: 1,
    old_values: null,
    new_values: { order_number: "ORD-000001", total_cents: 15000 },
    context: null,
    ip_address: "127.0.0.1",
    created_at: "2026-09-18T03:00:00.000000Z",
    ...overrides,
  };
}

export function makeAuditLogPage(overrides: Partial<AuditLogPage> = {}): AuditLogPage {
  return {
    data: [makeAuditLogEntry()],
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      links: [],
      path: "/api/v1/merchant/audit-log",
      per_page: 25,
      to: 1,
      total: 1,
    },
    ...overrides,
  };
}
