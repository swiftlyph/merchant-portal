import type { PropsWithChildren } from "react";
import { useCan } from "./store";
import { NoAccessPage } from "./pages/no-access-page";
import type { MerchantPermission } from "./permissions";

/**
 * Guards a page that requires a specific catalog permission (reports ->
 * reports.view, pos -> orders.create). Unlike RequireAuth/
 * RequireActiveMerchant, this never redirects — it renders NoAccessPage in
 * place, inside the normal layout, so a role change mid-session (or a
 * stale link) lands on a calm explanation rather than a blank screen or a
 * bounce that could loop. Backend enforcement is the real boundary; this
 * is purely "don't show the page" UX.
 */
export function RequirePermission({
  permission,
  children,
}: PropsWithChildren<{ permission: MerchantPermission }>) {
  const can = useCan(permission);

  if (!can) {
    return <NoAccessPage permission={permission} />;
  }

  return <>{children}</>;
}
