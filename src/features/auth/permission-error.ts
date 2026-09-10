import { ApiError } from "@/lib/api/client";
import { accessLevelFor, PERMISSION_LABEL, type MerchantPermission } from "./permissions";

/** True when a request failed specifically because the user lacks a catalog permission. */
export function isPermissionDenied(error: unknown): boolean {
  return error instanceof ApiError && error.code === "permission_denied";
}

/**
 * Turns a 403 permission_denied into copy naming what it takes, e.g.
 * "Voiding orders requires manager access." — shared across every
 * feature's own errors.ts rather than duplicated per file, since the
 * shape (errors.permission[0] -> PERMISSION_LABEL + accessLevelFor) is
 * identical everywhere. Falls back to the server's own message if the
 * permission name isn't one this build's catalog knows about
 * (additive-tolerant: an unrecognized permission never crashes, just
 * reads a little less specific).
 */
export function describePermissionDenied(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError) || error.code !== "permission_denied") {
    return fallback;
  }
  const permission = error.errors?.permission?.[0] as MerchantPermission | undefined;
  const label = permission ? PERMISSION_LABEL[permission] : undefined;
  if (!label || !permission) {
    return error.message || fallback;
  }
  return `${label} requires ${accessLevelFor(permission)}.`;
}
