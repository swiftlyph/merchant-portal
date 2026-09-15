import { api } from "@/lib/api/client";
import type {
  AddTeamMemberRequest,
  AddTeamMemberResponse,
  MerchantProfile,
  RemoveTeamMemberResponse,
  TeamMember,
  TeamMembersResponse,
  UpdateMerchantProfileRequest,
  UpdateTeamMemberRequest,
} from "./types";

/**
 * Parsers stay additive-tolerant, following the convention in
 * src/features/cash-sessions/api.ts: extra keys the backend adds later
 * pass through untouched, and fields that would otherwise crash a render
 * if missing/malformed are normalized defensively here.
 */

function normalizeProfile(raw: Partial<MerchantProfile> | null | undefined): MerchantProfile {
  return {
    id: raw?.id ?? 0,
    name: raw?.name ?? "",
    status: raw?.status ?? "pending",
    legal_name: raw?.legal_name ?? null,
    address_line1: raw?.address_line1 ?? null,
    address_line2: raw?.address_line2 ?? null,
    city: raw?.city ?? null,
    postal_code: raw?.postal_code ?? null,
    phone: raw?.phone ?? null,
    contact_email: raw?.contact_email ?? null,
    tax_identifier: raw?.tax_identifier ?? null,
    receipt_header: raw?.receipt_header ?? null,
    receipt_footer: raw?.receipt_footer ?? null,
    timezone: raw?.timezone ?? null,
    vat_registered: raw?.vat_registered ?? false,
    created_at: raw?.created_at ?? "",
    updated_at: raw?.updated_at ?? "",
  };
}

function normalizeTeamMember(raw: Partial<TeamMember> | null | undefined): TeamMember {
  return {
    id: raw?.id ?? 0,
    name: raw?.name ?? "",
    email: raw?.email ?? "",
    role_in_merchant: raw?.role_in_merchant ?? "staff",
    is_owner: raw?.is_owner ?? false,
    created_at: raw?.created_at ?? null,
  };
}

export async function fetchProfile(): Promise<MerchantProfile> {
  const raw = await api.get<Partial<MerchantProfile>>("/merchant/profile");
  return normalizeProfile(raw);
}

export async function updateProfile(
  request: UpdateMerchantProfileRequest,
): Promise<MerchantProfile> {
  const raw = await api.patch<Partial<MerchantProfile>>("/merchant/profile", request);
  return normalizeProfile(raw);
}

export async function fetchTeam(): Promise<TeamMembersResponse> {
  const raw = await api.get<Partial<TeamMembersResponse>>("/merchant/team");
  return {
    data: Array.isArray(raw.data) ? raw.data.map(normalizeTeamMember) : [],
  };
}

export function addTeamMember(request: AddTeamMemberRequest): Promise<AddTeamMemberResponse> {
  return api.post<AddTeamMemberResponse>("/merchant/team", request);
}

export function updateTeamMember(
  userId: number,
  request: UpdateTeamMemberRequest,
): Promise<TeamMember> {
  return api
    .patch<Partial<TeamMember>>(`/merchant/team/${userId}`, request)
    .then(normalizeTeamMember);
}

export function removeTeamMember(userId: number): Promise<RemoveTeamMemberResponse> {
  return api.delete<RemoveTeamMemberResponse>(`/merchant/team/${userId}`);
}
