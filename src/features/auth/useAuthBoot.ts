import { useEffect } from "react";
import { fetchMe } from "./api";
import { useAuthStore } from "./store";

/**
 * Runs once per app load while status is "booting": if a token was found in
 * storage, confirm it against /auth/me before treating the user as authed.
 *
 * This call intentionally does NOT suppress the global 401 handler: a stored
 * token that the server no longer honors is exactly what "session expired"
 * means, whether that happened seconds or days ago, so registerOnUnauthorized
 * (session.ts) is left to show that notice and redirect. The .catch() below
 * only exists as a fallback for a non-401 failure (e.g. a network error),
 * where that handler never fires and we still need to fall back to guest.
 */
export function useAuthBoot(): void {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status !== "booting") return;

    let cancelled = false;
    const token = useAuthStore.getState().token;

    fetchMe()
      .then((user) => {
        if (cancelled || !token) return;
        useAuthStore.getState().setAuthed(token, user);
      })
      .catch(() => {
        if (cancelled) return;
        useAuthStore.getState().clear();
      });

    return () => {
      cancelled = true;
    };
  }, [status]);
}
