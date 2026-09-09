import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "./store";
import { useAuthBoot } from "./useAuthBoot";
import * as authApi from "./api";

vi.mock("./api", () => ({
  fetchMe: vi.fn(),
}));

const user = {
  id: 1,
  name: "Merchant One",
  email: "merchant@gasa.test",
  roles: ["merchant"],
  merchant: { id: 1, name: "Merchant One", status: "active" as const },
};

describe("useAuthBoot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "guest", token: null, user: null, sessionNotice: null });
  });

  it("resolves to authed when the stored token is confirmed by /auth/me", async () => {
    useAuthStore.setState({ status: "booting", token: "tok-1" });
    vi.mocked(authApi.fetchMe).mockResolvedValue(user);

    renderHook(() => useAuthBoot());

    await waitFor(() => expect(useAuthStore.getState().status).toBe("authed"));
    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().token).toBe("tok-1");
    expect(authApi.fetchMe).toHaveBeenCalledWith();
  });

  it("clears to guest when the stored token is rejected by /auth/me", async () => {
    useAuthStore.setState({ status: "booting", token: "stale-token" });
    vi.mocked(authApi.fetchMe).mockRejectedValue(new Error("401"));

    renderHook(() => useAuthBoot());

    await waitFor(() => expect(useAuthStore.getState().status).toBe("guest"));
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("does nothing when there is no token to confirm", () => {
    useAuthStore.setState({ status: "guest", token: null });

    renderHook(() => useAuthBoot());

    expect(authApi.fetchMe).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe("guest");
  });
});
