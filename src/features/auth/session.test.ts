import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { useAuthStore } from "./store";
import { setQueryClientClear, setSessionNavigator, SESSION_EXPIRED_MESSAGE } from "./session";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const user = {
  id: 1,
  name: "Merchant One",
  email: "merchant@gasa.test",
  roles: ["merchant"],
  merchant: { id: 1, name: "Merchant One", status: "active" as const },
  permissions: [],
};

describe("onUnauthorized session handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ status: "authed", token: "tok", user, sessionNotice: null });
  });

  it("clears state, clears the query cache, and navigates exactly once", async () => {
    const navigate = vi.fn();
    const clearCache = vi.fn();
    setSessionNavigator(navigate);
    setQueryClientClear(clearCache);

    // Two concurrent requests both come back unauthorized — a real scenario
    // when a token is revoked mid-session and several queries are in flight.
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthenticated." }))
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthenticated." }));

    await Promise.all([
      api.get("/merchants/1").catch(() => {}),
      api.get("/merchants/2").catch(() => {}),
    ]);

    expect(useAuthStore.getState().status).toBe("guest");
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().sessionNotice).toBe(SESSION_EXPIRED_MESSAGE);
    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login");
  });

  it("does not fire for a request that explicitly suppresses it", async () => {
    const navigate = vi.fn();
    setSessionNavigator(navigate);
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(401, { message: "Invalid credentials.", code: "invalid_credentials" }),
    );

    await expect(
      api.post("/auth/login", {}, { suppressUnauthorized: true }),
    ).rejects.toMatchObject({ status: 401 });

    expect(navigate).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe("authed");
  });
});
