import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuthStore } from "@/features/auth/store";
import { useLogout } from "@/features/auth/useLogout";
import { useMe } from "@/features/auth/useMe";

/**
 * Placeholder solid-surface shell for "/app". `useMe` is the one live,
 * authenticated request this page makes — see its docstring for why that
 * matters beyond just fetching the name.
 */
export function DashboardPage() {
  const storeUser = useAuthStore((s) => s.user);
  const { data: user } = useMe();
  const logout = useLogout();

  const displayUser = user ?? storeUser;

  return (
    <div className="min-h-screen bg-base-200">
      <header className="navbar bg-base-100 shadow-sm">
        <div className="flex-1 px-2 text-lg font-semibold">GASA Merchant</div>
        <div className="flex flex-none items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="flex flex-col items-center justify-center gap-2 p-16 text-center">
        <h1 className="text-2xl font-bold">GASA merchant — coming soon</h1>
        <p className="text-base-content/70">
          {displayUser
            ? `Signed in as ${displayUser.name}.`
            : "The merchant dashboard will live here."}
        </p>
      </main>
    </div>
  );
}
