import { registerOnMerchantInactive } from "@/lib/api/client";
import { fetchMe } from "./api";
import { selectIsMerchantActive, useAuthStore } from "./store";

type Navigate = (path: string) => void;

let navigate: Navigate = () => {};

/** Wired once from providers.tsx, where the router lives. */
export function setMerchantGuardNavigator(fn: Navigate): void {
  navigate = fn;
}

// A lock, not a one-shot flag: guards against two /merchant/* requests that
// 403 in the same tick both kicking off their own refresh, without
// preventing a genuinely later suspension from being handled too.
let refreshing = false;

/**
 * Defense in depth for a merchant suspended mid-session (the routing guards
 * only run on navigation, so a token that was fine when /app was entered
 * could still be sitting on a now-suspended merchant). Any 403
 * "merchant_inactive" from a /merchant/* request refreshes /auth/me once and
 * re-derives routing from the result, landing the user on /suspended without
 * logging them out.
 *
 * Can't loop: /auth/me is not a merchant route (confirmed in the backend
 * contract), so this refresh itself can never come back with
 * "merchant_inactive" and re-trigger this handler.
 */
registerOnMerchantInactive(() => {
  if (refreshing) return;
  refreshing = true;

  fetchMe()
    .then((user) => {
      useAuthStore.getState().setUser(user);
    })
    .catch(() => {
      // /auth/me failing here is either a network blip (nothing to do) or a
      // 401, which the normal registerOnUnauthorized path already handles.
    })
    .finally(() => {
      refreshing = false;
      const state = useAuthStore.getState();
      if (state.status === "authed" && !selectIsMerchantActive(state)) {
        navigate("/suspended");
      }
    });
});
