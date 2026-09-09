import { registerOnUnauthorized } from "@/lib/api/client";
import { useAuthStore } from "./store";

type Navigate = (path: string) => void;
type ClearQueryCache = () => void;

let navigate: Navigate = () => {};
let clearQueryCache: ClearQueryCache = () => {};

/** Wired once from providers.tsx, where the router and query client live. */
export function setSessionNavigator(fn: Navigate): void {
  navigate = fn;
}

export function setQueryClientClear(fn: ClearQueryCache): void {
  clearQueryCache = fn;
}

export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please sign in again.";

// Registered once, at module load: any 401 that isn't explicitly suppressed
// (see RequestOptions.suppressUnauthorized) means the token is no longer
// valid, wherever in the app it happened.
registerOnUnauthorized(() => {
  const { status, clear, setSessionNotice } = useAuthStore.getState();
  // Idempotent: if we're already signed out, a second in-flight request's
  // 401 shouldn't clear the cache or navigate a second time.
  if (status === "guest") return;

  clear();
  clearQueryCache();
  setSessionNotice(SESSION_EXPIRED_MESSAGE);
  navigate("/login");
});
