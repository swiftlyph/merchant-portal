import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store";

/**
 * Guards a route for authed users only. By the time this renders, the app
 * root has already resolved "booting" to "guest" or "authed" (see
 * app/providers.tsx), so there's no third state to handle here.
 */
export function RequireAuth({ children }: PropsWithChildren) {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === "guest") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
