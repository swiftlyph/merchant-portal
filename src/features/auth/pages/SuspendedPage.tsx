import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { selectIsMerchantActive, useAuthStore } from "../store";
import { useLogout } from "../useLogout";

/**
 * A calm, solid-surface full-page state — no shell, no glass. Self-guards
 * like LoginPage does for its own "already authed" case: a guest lands here
 * only via a stale link, and an active merchant only via the mid-session
 * refresh in merchantGuard.ts flipping them back, so both redirect away
 * rather than showing a stale state.
 */
export function SuspendedPage() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const isActive = useAuthStore(selectIsMerchantActive);
  const logout = useLogout();

  if (status === "guest") {
    return <Navigate to="/login" replace />;
  }
  if (isActive) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-4 text-center">
      <h1 className="text-2xl font-bold">{user?.merchant?.name ?? "Your merchant"}</h1>
      <p className="text-muted-foreground">Your account is currently inactive.</p>
      <Button type="button" className="mt-2" onClick={() => logout.mutate()} disabled={logout.isPending}>
        Log out
      </Button>
    </div>
  );
}
