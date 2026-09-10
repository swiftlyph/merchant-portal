import { Link } from "react-router-dom";
import { IconLock } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { PERMISSION_LABEL, type MerchantPermission } from "../permissions";

/**
 * Rendered in place, inside the dashboard layout — never a redirect. A
 * permission-guarded route reached without the permission (direct
 * navigation, a stale link, a role change mid-session) is a normal, calm
 * outcome to explain, not an error to bounce away from: a redirect here
 * risks a loop if the destination itself isn't reachable either, and a
 * blank screen tells the user nothing.
 */
export function NoAccessPage({ permission }: { permission: MerchantPermission }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <IconLock className="size-8 text-muted-foreground" />
      <h1 className="text-lg font-semibold">You don't have access to this page</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {`This page requires ${PERMISSION_LABEL[permission]}.`}
      </p>
      <Button asChild variant="outline" size="sm" className="mt-2">
        <Link to="/app/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
