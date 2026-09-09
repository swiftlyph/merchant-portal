import { useAuthStore } from "@/features/auth/store";
import { useMe } from "@/features/auth/use-me";
import { PlaceholderPage } from "@/components/ui/placeholder-page";

/**
 * `/app/dashboard`. `useMe` stays wired here as the one live, authenticated
 * request this page makes — see its docstring for why that matters beyond
 * just fetching the name: a revoked token 401s here and drives session
 * expiry via the normal registerOnUnauthorized path.
 */
export function DashboardPage() {
  const storeUser = useAuthStore((s) => s.user);
  const { data: user } = useMe();

  const displayUser = user ?? storeUser;

  return (
    <div className="flex flex-col gap-2">
      {displayUser && (
        <p className="text-sm text-muted-foreground">Signed in as {displayUser.name}.</p>
      )}
      <PlaceholderPage title="Dashboard" />
    </div>
  );
}
