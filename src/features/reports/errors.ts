import { ApiError } from "@/lib/api/client";
import { describePermissionDenied, isPermissionDenied } from "@/features/auth/permission-error";

/** True when a report request failed because the range exceeds the server's documented cap. */
export function isRangeTooLarge(error: unknown): boolean {
  return error instanceof ApiError && error.code === "range_too_large";
}

export function describeReportError(error: unknown): string {
  if (isPermissionDenied(error)) {
    return describePermissionDenied(error, "Couldn't load this report.");
  }
  if (error instanceof ApiError) {
    if (error.code === "range_too_large") {
      return error.message || "That range is too large — try a narrower one.";
    }
    return error.message || "Couldn't load this report.";
  }
  return error instanceof Error ? error.message : "Couldn't load this report.";
}
