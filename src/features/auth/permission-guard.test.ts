import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { useAuthStore } from "./store";
import "./permission-guard";
import { STAFF_PRESET, OWNER_PRESET } from "./permissions";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const PERMISSION_DENIED = {
  message: "This action requires the 'orders.void' permission.",
  code: "permission_denied",
  errors: { permission: ["orders.void"] },
};

const staffUser = {
  id: 2,
  name: "Staffer",
  email: "staff@gasa.test",
  roles: [] as string[],
  merchant: { id: 1, name: "Merchant One", status: "active" as const },
  permissions: [...STAFF_PRESET],
};

const managerUser = { ...staffUser, permissions: [...OWNER_PRESET] };

describe("mid-session permission_denied handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ status: "authed", token: "tok", user: staffUser, sessionNotice: null });
  });

  it("refetches /auth/me once for two concurrent 403s and replaces the stored user", async () => {
    let meCalls = 0;
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      if (String(input).endsWith("/auth/me")) {
        meCalls += 1;
        return Promise.resolve(jsonResponse(200, managerUser));
      }
      return Promise.resolve(jsonResponse(403, PERMISSION_DENIED));
    });

    await Promise.all([
      api.post("/merchant/orders/1/void").catch(() => {}),
      api.post("/merchant/orders/2/void").catch(() => {}),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(meCalls).toBe(1);
    expect(useAuthStore.getState().user?.permissions).toEqual(managerUser.permissions);
    // Not logged out — a re-sync, not a session expiry.
    expect(useAuthStore.getState().status).toBe("authed");
    expect(useAuthStore.getState().token).toBe("tok");
  });

  it("a later, separate 403 triggers its own refresh (not a permanent lock)", async () => {
    let meCalls = 0;
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      if (String(input).endsWith("/auth/me")) {
        meCalls += 1;
        return Promise.resolve(jsonResponse(200, managerUser));
      }
      return Promise.resolve(jsonResponse(403, PERMISSION_DENIED));
    });

    await api.post("/merchant/orders/1/void").catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(meCalls).toBe(1);

    await api.post("/merchant/orders/2/void").catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(meCalls).toBe(2);
  });

  it("does not fire for confirmation_requires_second_user (a distinct 403 code)", async () => {
    let meCalls = 0;
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      if (String(input).endsWith("/auth/me")) {
        meCalls += 1;
        return Promise.resolve(jsonResponse(200, managerUser));
      }
      return Promise.resolve(
        jsonResponse(403, {
          message: "A remittance must be confirmed by someone other than the person who created it.",
          code: "confirmation_requires_second_user",
        }),
      );
    });

    await api.post("/merchant/cash-sessions/1/remittances/1/confirm").catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(meCalls).toBe(0);
  });
});
