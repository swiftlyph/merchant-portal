import { ApiError } from "@/lib/api/client";
import { describePermissionDenied, isPermissionDenied } from "@/features/auth/permission-error";

/**
 * Settings error codes get plain-language messages. member_already_exists
 * and email_unavailable are deliberately worded to look almost identical —
 * the backend collapses "already on this merchant" and "belongs to another
 * account entirely" into two separate codes precisely so neither response
 * reveals which merchant (if any) owns the email; the copy here preserves
 * that by never naming another merchant.
 */

export function describeProfileError(error: unknown): string {
  if (isPermissionDenied(error)) {
    return describePermissionDenied(error, "Couldn't save the profile.");
  }
  if (error instanceof ApiError) {
    return error.message || "Couldn't save the profile.";
  }
  return error instanceof Error ? error.message : "Couldn't save the profile.";
}

export function describeAddMemberError(error: unknown): string {
  if (isPermissionDenied(error)) {
    return describePermissionDenied(error, "Couldn't add that team member.");
  }
  if (error instanceof ApiError) {
    if (error.code === "member_already_exists") {
      return "This email is already on your team.";
    }
    if (error.code === "email_unavailable") {
      return "This email address is unavailable.";
    }
    return error.message || "Couldn't add that team member.";
  }
  return error instanceof Error ? error.message : "Couldn't add that team member.";
}

export function describeUpdateMemberError(error: unknown): string {
  if (isPermissionDenied(error)) {
    return describePermissionDenied(error, "Couldn't update that team member's role.");
  }
  if (error instanceof ApiError) {
    return error.message || "Couldn't update that team member's role.";
  }
  return error instanceof Error ? error.message : "Couldn't update that team member's role.";
}

export function describeRemoveMemberError(error: unknown): string {
  if (isPermissionDenied(error)) {
    return describePermissionDenied(error, "Couldn't remove that team member.");
  }
  if (error instanceof ApiError) {
    if (error.code === "cannot_remove_owner") {
      return "The merchant's owner can't be removed from the team.";
    }
    return error.message || "Couldn't remove that team member.";
  }
  return error instanceof Error ? error.message : "Couldn't remove that team member.";
}
