import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { describePermissionDenied, isPermissionDenied } from "./permission-error";

describe("isPermissionDenied", () => {
  it("is true for a 403 permission_denied ApiError", () => {
    const error = new ApiError({ status: 403, code: "permission_denied", message: "nope" });
    expect(isPermissionDenied(error)).toBe(true);
  });

  it("is false for other ApiErrors, and for non-ApiError values", () => {
    expect(
      isPermissionDenied(new ApiError({ status: 403, code: "merchant_inactive", message: "x" })),
    ).toBe(false);
    expect(isPermissionDenied(new Error("boom"))).toBe(false);
    expect(isPermissionDenied(undefined)).toBe(false);
  });
});

describe("describePermissionDenied", () => {
  it("names the permission and its required access level", () => {
    const error = new ApiError({
      status: 403,
      code: "permission_denied",
      message: "This action requires the 'orders.void' permission.",
      errors: { permission: ["orders.void"] },
    });
    expect(describePermissionDenied(error, "fallback")).toBe(
      "Voiding orders requires manager access.",
    );
  });

  it("names owner access for an owner-only permission", () => {
    const error = new ApiError({
      status: 403,
      code: "permission_denied",
      message: "This action requires the 'team.manage' permission.",
      errors: { permission: ["team.manage"] },
    });
    expect(describePermissionDenied(error, "fallback")).toBe(
      "Managing the team requires owner access.",
    );
  });

  it("falls back for a non-permission_denied error", () => {
    const error = new ApiError({ status: 409, code: "session_closed", message: "closed" });
    expect(describePermissionDenied(error, "fallback text")).toBe("fallback text");
  });

  it("falls back to the server message for an unrecognized permission name", () => {
    const error = new ApiError({
      status: 403,
      code: "permission_denied",
      message: "server says no",
      errors: { permission: ["something.new"] },
    });
    expect(describePermissionDenied(error, "fallback")).toBe("server says no");
  });

  it("falls back for a non-ApiError value", () => {
    expect(describePermissionDenied(new Error("boom"), "fallback")).toBe("fallback");
  });
});
