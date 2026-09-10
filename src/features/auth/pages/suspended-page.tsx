import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Merchant } from "@/lib/api/types";
import { selectIsMerchantActive, useAuthStore } from "../store";
import { useLogout } from "../use-logout";

/**
 * /auth/me distinguishes three reasons a user can land here, and they read
 * very differently: removed from the team entirely, the business itself
 * suspended, or a brand-new business still awaiting platform approval.
 * merchant === null covers both "removed" and "never attached" — from the
 * user's side both just mean "no business," so one copy serves both.
 */
function suspendedCopyFor(merchant: Merchant | null): string {
  if (merchant === null) {
    return "You no longer have access to this business. If you think this is a mistake, ask the owner to re-invite you.";
  }
  if (merchant.status === "pending") {
    return "This business is awaiting approval. You'll be able to get started once it's approved.";
  }
  return "Your account is currently inactive.";
}

/**
 * A calm, solid-surface full-page state — no shell, no glass. Self-guards
 * like LoginPage does for its own "already authed" case: a guest lands here
 * only via a stale link, and an active merchant only via the mid-session
 * refresh in merchant-guard.ts flipping them back, so both redirect away
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

  const merchant = user?.merchant ?? null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-4 text-center">
      <h1 className="text-2xl font-bold">{merchant?.name ?? "Your merchant"}</h1>
      <p className="text-muted-foreground">{suspendedCopyFor(merchant)}</p>
      <Button type="button" className="mt-2" onClick={() => logout.mutate()} disabled={logout.isPending}>
        Log out
      </Button>
    </div>
  );
}
