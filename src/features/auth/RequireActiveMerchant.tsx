import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";
import { selectIsMerchantActive, useAuthStore } from "./store";

/**
 * Wraps RequireAuth (guest -> /login) with the merchant-status check: an
 * authed user whose merchant is missing or not active is sent to /suspended
 * instead of the protected content.
 */
export function RequireActiveMerchant({ children }: PropsWithChildren) {
  return (
    <RequireAuth>
      <ActiveMerchantGate>{children}</ActiveMerchantGate>
    </RequireAuth>
  );
}

function ActiveMerchantGate({ children }: PropsWithChildren) {
  const isActive = useAuthStore(selectIsMerchantActive);

  if (!isActive) {
    return <Navigate to="/suspended" replace />;
  }

  return <>{children}</>;
}
