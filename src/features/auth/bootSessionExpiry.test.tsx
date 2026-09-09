import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "./store";
import { useAuthBoot } from "./useAuthBoot";
import { setQueryClientClear, setSessionNavigator, SESSION_EXPIRED_MESSAGE } from "./session";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Exercises the real /auth/me call (not a mocked ./api) so a revoked/expired
 * token found at boot goes through the same registerOnUnauthorized path as a
 * token that dies mid-session — this is what the "revoke the token, then any
 * request bounces the user to /login with a notice" acceptance case relies on.
 */
describe("boot with a token the server no longer honors", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ status: "booting", token: "revoked-token", user: null, sessionNotice: null });
  });

  it("shows the session-expired notice and navigates to /login, not a silent guest", async () => {
    const navigate = vi.fn();
    const clearCache = vi.fn();
    setSessionNavigator(navigate);
    setQueryClientClear(clearCache);
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(401, { message: "Unauthenticated." }),
    );

    renderHook(() => useAuthBoot());

    await waitFor(() => expect(useAuthStore.getState().status).toBe("guest"));
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().sessionNotice).toBe(SESSION_EXPIRED_MESSAGE);
    expect(navigate).toHaveBeenCalledWith("/login");
    expect(clearCache).toHaveBeenCalledTimes(1);
  });
});
