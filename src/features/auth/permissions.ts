/**
 * The merchant-portal permission catalog — mirrors
 * app/Domains/Merchant/Enums/MerchantPermission.php in gasa-api exactly
 * (17 cases, dot-separated strings). This is the ONE place the catalog is
 * named on the frontend; useCan (see store.ts) is the ONE way components
 * ask whether the current user holds one.
 *
 * Backend enforcement is the actual security boundary — see
 * PermissionDenied.php and RolePresets.php there. Everything here is UX:
 * hiding what can't be done, and explaining it when a stale/inactive tab
 * tries anyway (permission-guard.ts).
 */
export type MerchantPermission =
  | "orders.view"
  | "orders.create"
  | "orders.complete"
  | "orders.void"
  | "queue.view"
  | "menu.view"
  | "drawer.view"
  | "drawer.open"
  | "drawer.close"
  | "drawer.movements"
  | "remittances.create"
  | "remittances.confirm"
  | "reports.view"
  | "profile.view"
  | "profile.edit"
  | "team.view"
  | "team.manage"
  | "audit_log.view";

export const MERCHANT_PERMISSION_VALUES: readonly MerchantPermission[] = [
  "orders.view",
  "orders.create",
  "orders.complete",
  "orders.void",
  "queue.view",
  "menu.view",
  "drawer.view",
  "drawer.open",
  "drawer.close",
  "drawer.movements",
  "remittances.create",
  "remittances.confirm",
  "reports.view",
  "profile.view",
  "profile.edit",
  "team.view",
  "team.manage",
  "audit_log.view",
];

/**
 * The three role presets, mirroring RolePresets.php exactly — exported for
 * test fixtures (an "owner" or "staff" test user should hold exactly one
 * of these) as much as for accessLevelFor below. Not used by useCan or any
 * authorization/gating decision: /auth/me always sends the resolved
 * permissions list directly, and that list is never re-derived from a role
 * on the frontend — accessLevelFor's ONLY consumer is describePermissionDenied
 * (permission-error.ts), for display copy on an already-denied 403.
 *
 * THIS IS A SECOND COPY of a mapping the backend deliberately keeps as the
 * one source of truth (see RolePresets.php's own docblock). It exists only
 * because turning a denied "orders.void" into "requires manager access"
 * needs to know which role grants it, and the 403 payload doesn't carry
 * that today. If RolePresets.php ever changes (e.g. staff gains
 * drawer.close), THESE THREE ARRAYS MUST CHANGE WITH IT or the error copy
 * will quietly lie about what's required. The durable fix is a backend hint
 * (e.g. errors.required_role on permission_denied) so the frontend can
 * drop this table entirely — tracked as backlog, not yet done.
 */
export const STAFF_PRESET: readonly MerchantPermission[] = [
  "orders.view",
  "orders.create",
  "orders.complete",
  "queue.view",
  "menu.view",
  "drawer.view",
  "drawer.open",
  "drawer.movements",
  "remittances.create",
];
export const MANAGER_PRESET: readonly MerchantPermission[] = MERCHANT_PERMISSION_VALUES.filter(
  (permission) => permission !== "profile.edit" && permission !== "team.manage",
);
export const OWNER_PRESET: readonly MerchantPermission[] = MERCHANT_PERMISSION_VALUES;

/**
 * Human copy for a denied permission, used by the permission_denied error
 * mapper (permission-error.ts) to turn e.g. "orders.void" into "Voiding
 * orders requires manager access." Never used for authorization logic
 * itself — only ->value (the MerchantPermission string) is ever sent to or
 * compared against the backend.
 */
export const PERMISSION_LABEL: Record<MerchantPermission, string> = {
  "orders.view": "Viewing orders",
  "orders.create": "Creating orders",
  "orders.complete": "Completing orders",
  "orders.void": "Voiding orders",
  "queue.view": "Viewing the queue",
  "menu.view": "Viewing the menu",
  "drawer.view": "Viewing the cash drawer",
  "drawer.open": "Opening the cash drawer",
  "drawer.close": "Closing the cash drawer",
  "drawer.movements": "Recording cash movements",
  "remittances.create": "Recording a remittance",
  "remittances.confirm": "Confirming a remittance",
  "reports.view": "Viewing reports",
  "profile.view": "Viewing the business profile",
  "profile.edit": "Editing the business profile",
  "team.view": "Viewing the team",
  "team.manage": "Managing the team",
  "audit_log.view": "Viewing the audit trail",
};

/**
 * The lowest role preset that grants a permission — owner < manager < staff
 * in "how many permissions it holds" doesn't hold generally (staff is a
 * different subset, not a strict subset of manager), so this checks STAFF_
 * and MANAGER_PRESET directly rather than deriving an ordering.
 */
export function accessLevelFor(permission: MerchantPermission): string {
  if (STAFF_PRESET.includes(permission)) return "staff access";
  if (MANAGER_PRESET.includes(permission)) return "manager access";
  return "owner access";
}
