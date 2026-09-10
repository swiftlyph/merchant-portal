import type { AddTeamMemberResponse, MerchantProfile, TeamMember, TeamMembersResponse } from "./types";

export function makeProfile(overrides: Partial<MerchantProfile> = {}): MerchantProfile {
  return {
    id: 1,
    name: "Merchant One",
    status: "active",
    legal_name: "Merchant One Foods Inc.",
    address_line1: "123 Main St",
    address_line2: null,
    city: "Quezon City",
    postal_code: "1100",
    phone: "0917-555-0100",
    contact_email: "hello@merchantone.test",
    tax_identifier: "123-456-789-000",
    receipt_header: "Merchant One",
    receipt_footer: "Thank you for your order!",
    timezone: "Asia/Manila",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

export function makeTeamMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 2,
    name: "Jamie Cruz",
    email: "jamie@merchantone.test",
    role_in_merchant: "staff",
    is_owner: false,
    created_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeTeamMembersResponse(
  overrides: Partial<TeamMembersResponse> = {},
): TeamMembersResponse {
  return {
    data: [
      makeTeamMember({ id: 1, name: "Merchant One", email: "merchant@gasa.test", is_owner: true, role_in_merchant: "owner" }),
      makeTeamMember(),
    ],
    ...overrides,
  };
}

export function makeAddTeamMemberResponse(
  overrides: Partial<AddTeamMemberResponse> = {},
): AddTeamMemberResponse {
  return {
    id: 3,
    name: "New Hire",
    email: "new.hire@merchantone.test",
    role_in_merchant: "staff",
    is_owner: false,
    created_at: "2026-09-10T00:00:00.000Z",
    invite: {
      token: "test-invite-token-abc123",
      expires_at: "2026-09-13T00:00:00.000Z",
      url: "/accept-invite?token=test-invite-token-abc123",
    },
    ...overrides,
  };
}
