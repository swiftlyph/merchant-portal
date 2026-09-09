import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN_KEY = "gasa_merchant_auth_token";
const user = { id: 1, name: "Merchant One", email: "merchant@gasa.test", roles: ["merchant"] };

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
});
