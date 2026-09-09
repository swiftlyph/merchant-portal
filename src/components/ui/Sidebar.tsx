import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/features/auth/store";
import { useMe } from "@/features/auth/useMe";
import { useLogout } from "@/features/auth/useLogout";

interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
}

// Icons kept inline (stroke="currentColor", 1.5 width) to match the sun/moon
// pair in ThemeToggle — no icon library is installed in this repo.
const NAV_ITEMS: NavItem[] = [
  {
    to: "/app/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6ZM13 3v6h8V3h-8Z"
        />
      </svg>
    ),
  },
  {
    to: "/app/pos",
    label: "POS",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 9h18M7 15h2m4 0h4M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        />
      </svg>
    ),
  },
  {
    to: "/app/kitchen-queue",
    label: "Kitchen Queue",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    ),
  },
  {
    to: "/app/orders",
    label: "Orders",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-5 8h6m-6 4h6"
        />
      </svg>
    ),
  },
];

/**
 * Left nav rail: brand wordmark, primary nav (active state via NavLink),
 * user chip + logout pinned to the bottom. Layout mirrors the bitepoint
 * mockup's structure — logo top-left, icon+label rows, profile/logout
 * footer — but stays on this app's own "GASA Merchant" brand and gasa/
 * gasadark theme tokens rather than the mockup's colors.
 */
export function Sidebar() {
  const storeUser = useAuthStore((s) => s.user);
  const { data: user } = useMe();
  const logout = useLogout();

  const displayUser = user ?? storeUser;

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-background">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 2c2 2.5 3 5.5 3 8a3 3 0 1 1-6 0c0-2.5 1-5.5 3-8Zm0 20v-4m-4 4 1.5-3m6.5 3-1.5-3"
            />
          </svg>
        </span>
        <span className="text-lg font-bold">
          <span className="text-secondary">GASA</span> Merchant
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <span className="h-5 w-5 shrink-0">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar>
            <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
              {(displayUser?.name ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{displayUser?.name ?? "…"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {displayUser?.merchant?.name ?? "Merchant"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 w-full justify-start gap-3 px-2 font-medium text-muted-foreground"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2m4-14 5 5-5 5m5-5H9"
            />
          </svg>
          Logout
        </Button>
      </div>
    </aside>
  );
}
