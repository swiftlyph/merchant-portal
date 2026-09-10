import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { useAuthStore } from "./store";
import { setMerchantGuardNavigator } from "./merchant-guard";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const MERCHANT_INACTIVE = { message: "Merchant inactive.", code: "merchant_inactive" };

const activeUser = {
  id: 1,
  name: "Merchant One",
  email: "merchant@gasa.test",
  roles: ["merchant"],
  merchant: { id: 1, name: "Merchant One", status: "active" as const },
  permissions: [],
};

const suspendedUser = { ...activeUser, merchant: { ...activeUser.merchant, status: "suspended" as const } };

/** Polls until `fn` doesn't throw, or the timeout elapses — for asserting on
 * an async chain (403 -> refresh /auth/me -> navigate) that isn't awaited by
 * the request that triggered it. */
async function waitFor(fn: () => void, { timeoutMs = 1000, intervalMs = 5 } = {}) {
  const start = Date.now();
  for (;;) {
    try {
      fn();
      return;
    } catch (error) {
      if (Date.now() - start > timeoutMs) throw error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

describe("mid-session merchant_inactive handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ status: "authed", token: "tok", user: activeUser, sessionNotice: null });
  });

  it("refreshes /auth/me once and navigates to /suspended exactly once for two concurrent 403s", async () => {
    const navigate = vi.fn();
    setMerchantGuardNavigator(navigate);

    let meCalls = 0;
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      if (String(input).endsWith("/auth/me")) {
        meCalls += 1;
        return Promise.resolve(jsonResponse(200, suspendedUser));
      }
      return Promise.resolve(jsonResponse(403, MERCHANT_INACTIVE));
    });

    await Promise.all([
      api.get("/merchant/orders").catch(() => {}),
      api.get("/merchant/products").catch(() => {}),
    ]);

    await waitFor(() => expect(navigate).toHaveBeenCalled());

    expect(meCalls).toBe(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/suspended");
    expect(useAuthStore.getState().user?.merchant?.status).toBe("suspended");
    // Not logged out — this is a redirect, not a session expiry.
    expect(useAuthStore.getState().status).toBe("authed");
    expect(useAuthStore.getState().token).toBe("tok");
  });

  it("does not navigate when the refreshed merchant turns out active after all", async () => {
    const navigate = vi.fn();
    setMerchantGuardNavigator(navigate);
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      if (String(input).endsWith("/auth/me")) return Promise.resolve(jsonResponse(200, activeUser));
      return Promise.resolve(jsonResponse(403, MERCHANT_INACTIVE));
    });

    await api.get("/merchant/orders").catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(navigate).not.toHaveBeenCalled();
  });

  it("a later, separate 403 triggers its own refresh (not a permanent lock)", async () => {
    const navigate = vi.fn();
    setMerchantGuardNavigator(navigate);
    let meCalls = 0;
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      if (String(input).endsWith("/auth/me")) {
        meCalls += 1;
        return Promise.resolve(jsonResponse(200, suspendedUser));
      }
      return Promise.resolve(jsonResponse(403, MERCHANT_INACTIVE));
    });

    await api.get("/merchant/orders").catch(() => {});
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));

    await api.get("/merchant/products").catch(() => {});
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(2));

    expect(meCalls).toBe(2);
  });
});
