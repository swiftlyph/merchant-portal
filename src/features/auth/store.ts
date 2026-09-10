import { create } from "zustand";
import { registerTokenGetter } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/types";
import type { MerchantPermission } from "./permissions";

export type AuthStatus = "booting" | "guest" | "authed";

const TOKEN_STORAGE_KEY = "gasa_merchant_auth_token";

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable (e.g. private browsing) — auth still works for this load.
  }
}

export interface AuthState {
  status: AuthStatus;
  /** Persisted. The only piece of auth state that survives a reload. */
  token: string | null;
  /** NEVER persisted — roles could go stale, so it's always rehydrated from /auth/me. */
  user: AuthUser | null;
  /** A one-shot message for the login page, e.g. after a forced logout. */
  sessionNotice: string | null;
  setAuthed: (token: string, user: AuthUser) => void;
  /** Replaces the user without touching status/token — a mid-session refresh, not a login. */
  setUser: (user: AuthUser) => void;
  /** Drops back to a signed-out state, clearing the persisted token. */
  clear: () => void;
  setSessionNotice: (notice: string | null) => void;
}

const initialToken = readStoredToken();

export const useAuthStore = create<AuthState>((set) => ({
  status: initialToken ? "booting" : "guest",
  token: initialToken,
  user: null,
  sessionNotice: null,
  setAuthed: (token, user) => {
    persistToken(token);
    set({ status: "authed", token, user, sessionNotice: null });
  },
  setUser: (user) => set({ user }),
  clear: () => {
    persistToken(null);
    set({ status: "guest", token: null, user: null });
  },
  setSessionNotice: (notice) => set({ sessionNotice: notice }),
}));

// Wired once, at module load: the api client asks this store for the bearer
// token on every request rather than reading storage directly.
registerTokenGetter(() => useAuthStore.getState().token);

/**
 * The single source of truth for merchant-status routing: RequireActiveMerchant
 * and SuspendedPage both read this, so they can never disagree about which
 * side of /suspended a given user belongs on.
 */
export function selectIsMerchantActive(state: AuthState): boolean {
  return state.user?.merchant?.status === "active";
}

/**
 * The ONE way anything in the app checks whether the current user holds a
 * given catalog permission. Absent permissions (guest, no active merchant,
 * or genuinely not granted) all read as false the same way — there's no
 * separate "unknown" state to handle, matching /auth/me always sending an
 * array (possibly empty), never omitting the field.
 */
export function selectHasPermission(permission: MerchantPermission) {
  return (state: AuthState): boolean => Boolean(state.user?.permissions?.includes(permission));
}

/** Convenience hook wrapping selectHasPermission — `useCan("orders.void")`. */
export function useCan(permission: MerchantPermission): boolean {
  return useAuthStore(selectHasPermission(permission));
}
