/**
 * Shapes verified against the real backend source (gasa-api), not just the
 * spec doc: App\Domains\Merchant\Http\Resources\{MerchantProfileResource,
 * TeamMemberResource}, their Requests, and TeamController/
 * MerchantProfileController. No money fields in this feature.
 */

export type MerchantStatus = "pending" | "active" | "suspended";

/**
 * GET/PATCH /merchant/profile — flat, no `data` wrapper. `timezone` is
 * present on the wire but not wired to anything yet: it is read here only
 * so the type matches the backend exactly, and is never rendered as an
 * editable field (see MerchantProfileResource's docblock).
 */
export interface MerchantProfile {
  id: number;
  name: string;
  status: MerchantStatus;
  legal_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  contact_email: string | null;
  tax_identifier: string | null;
  receipt_header: string | null;
  receipt_footer: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * PATCH /merchant/profile payload — every field `sometimes`+`nullable` on
 * the backend (UpdateMerchantProfileRequest). name/status/id/timezone are
 * deliberately excluded: they are not accepted by this endpoint at all.
 */
export interface UpdateMerchantProfileRequest {
  legal_name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  contact_email?: string | null;
  tax_identifier?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
}

/**
 * app/Domains/Merchant/Enums/RoleInMerchant.php — recorded and returned
 * only, NOT enforced as an authorization boundary yet. Never build UI that
 * gates visibility/actions by role.
 */
export type RoleInMerchant = "owner" | "manager" | "cashier";

export const ROLE_IN_MERCHANT_VALUES: RoleInMerchant[] = ["owner", "manager", "cashier"];

/** A single row from GET /merchant/team (TeamMemberResource). */
export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role_in_merchant: RoleInMerchant;
  is_owner: boolean;
  created_at: string | null;
}

/** GET /merchant/team — explicit { data: [...] } envelope. */
export interface TeamMembersResponse {
  data: TeamMember[];
}

export interface AddTeamMemberRequest {
  name: string;
  email: string;
  role_in_merchant: RoleInMerchant;
}

/**
 * POST /merchant/team response (201) — a flat object, NOT a
 * TeamMemberResource. `invite` is only present in local/development
 * environments (TeamController::store) — never assume it exists.
 */
export interface AddTeamMemberResponse {
  id: number;
  name: string;
  email: string;
  role_in_merchant: RoleInMerchant;
  is_owner: false;
  created_at: string | null;
  invite?: {
    token: string;
    expires_at: string;
    /**
     * Dev-only convenience link, shaped as `/accept-invite?token=...`
     * (CreateTeamInvitationAction) — not `/invite/:token`. The accept-invite
     * page is reachable at both paths, so this URL works as-is.
     */
    url: string;
  };
}

export interface UpdateTeamMemberRequest {
  role_in_merchant: RoleInMerchant;
}

export interface RemoveTeamMemberResponse {
  message: string;
  code: string;
}
