import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN_KEY = "gasa_merchant_auth_token";
const user = {
  id: 1,
  name: "Merchant One",
  email: "merchant@gasa.test",
  roles: ["merchant"],
  merchant: { id: 1, name: "Merchant One", status: "active" as const },
};

describe("auth store", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("starts as guest when no token is stored", async () => {
    const { useAuthStore } = await import("./store");
    expect(useAuthStore.getState().status).toBe("guest");
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("starts as booting when a token is already in storage", async () => {
    localStorage.setItem(TOKEN_KEY, "existing-token");
    const { useAuthStore } = await import("./store");
    expect(useAuthStore.getState().status).toBe("booting");
    expect(useAuthStore.getState().token).toBe("existing-token");
  });

  it("setAuthed persists the token but never the user", async () => {
    const { useAuthStore } = await import("./store");
    useAuthStore.getState().setAuthed("new-token", user);

    expect(localStorage.getItem(TOKEN_KEY)).toBe("new-token");
    expect(useAuthStore.getState().status).toBe("authed");
    expect(useAuthStore.getState().user).toEqual(user);

    // A fresh boot only ever has the token to go on, never a cached user.
    vi.resetModules();
    const { useAuthStore: rehydrated } = await import("./store");
    expect(rehydrated.getState().token).toBe("new-token");
    expect(rehydrated.getState().user).toBeNull();
  });

  it("clear removes the persisted token and drops back to guest", async () => {
    const { useAuthStore } = await import("./store");
    useAuthStore.getState().setAuthed("tok", user);

    useAuthStore.getState().clear();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(useAuthStore.getState().status).toBe("guest");
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("setUser replaces the user without touching status or token", async () => {
    const { useAuthStore } = await import("./store");
    useAuthStore.getState().setAuthed("tok", user);

    const suspended = { ...user, merchant: { ...user.merchant, status: "suspended" as const } };
    useAuthStore.getState().setUser(suspended);

    expect(useAuthStore.getState().user).toEqual(suspended);
    expect(useAuthStore.getState().status).toBe("authed");
    expect(useAuthStore.getState().token).toBe("tok");
  });

  it("setAuthed captures the merchant object from the me/login payload", async () => {
    const { useAuthStore } = await import("./store");
    useAuthStore.getState().setAuthed("tok", user);

    expect(useAuthStore.getState().user?.merchant).toEqual({
      id: 1,
      name: "Merchant One",
      status: "active",
    });
  });

  describe("selectIsMerchantActive", () => {
    it("is true only when status is active", async () => {
      const { useAuthStore, selectIsMerchantActive } = await import("./store");
      useAuthStore.getState().setAuthed("tok", user);
      expect(selectIsMerchantActive(useAuthStore.getState())).toBe(true);
    });

    it("is false for a suspended merchant", async () => {
      const { useAuthStore, selectIsMerchantActive } = await import("./store");
      useAuthStore.getState().setAuthed("tok", {
        ...user,
        merchant: { ...user.merchant, status: "suspended" },
      });
      expect(selectIsMerchantActive(useAuthStore.getState())).toBe(false);
    });

    it("is false when there is no merchant at all", async () => {
      const { useAuthStore, selectIsMerchantActive } = await import("./store");
      useAuthStore.getState().setAuthed("tok", { ...user, merchant: null });
      expect(selectIsMerchantActive(useAuthStore.getState())).toBe(false);
    });

    it("is false for a guest with no user", async () => {
      const { useAuthStore, selectIsMerchantActive } = await import("./store");
      expect(selectIsMerchantActive(useAuthStore.getState())).toBe(false);
    });
  });
});
