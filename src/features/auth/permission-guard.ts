import { registerOnPermissionDenied } from "@/lib/api/client";
import { fetchMe } from "./api";
import { useAuthStore } from "./store";

// A lock, not a one-shot flag — same reasoning as merchant-guard.ts's
// `refreshing`: two permission_denied responses in the same tick should
// only trigger one /auth/me refresh, without permanently blocking a later,
// genuinely separate denial from refreshing again.
let refreshing = false;

/**
 * Defense in depth for a role changed mid-session (an owner demotes a
 * manager while their tab is still open) or a hidden action reached
 * anyway (devtools, a stale tab). Any 403 "permission_denied" refetches
 * /auth/me once and replaces the stored user — components reading useCan
 * re-render against the fresh permission set immediately after, no reload
 * needed. The action itself still failed; this only re-syncs the UI so
 * the NEXT attempt reflects reality.
 *
 * Can't loop: /auth/me carries no merchant-permission requirement of its
 * own (confirmed in the backend contract, same as merchant-guard.ts's
 * note for merchant_inactive), so this refresh itself can never come back
 * with permission_denied and re-trigger this handler.
 */
registerOnPermissionDenied(() => {
  if (refreshing) return;
  refreshing = true;

  fetchMe()
    .then((user) => {
      useAuthStore.getState().setUser(user);
    })
    .catch(() => {
      // A network blip or a 401 — the latter already goes through the
      // normal registerOnUnauthorized path (session.ts).
    })
    .finally(() => {
      refreshing = false;
    });
});
