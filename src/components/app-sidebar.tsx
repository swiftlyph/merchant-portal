import {
  LayoutDashboardIcon,
  CreditCardIcon,
  ClockIcon,
  ClipboardListIcon,
  PackageIcon,
  BoxesIcon,
  WalletIcon,
  BarChart3Icon,
  SettingsIcon,
} from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useCan } from "@/features/auth/store"
import { useKitchenQueueSummary } from "@/features/kitchen-queue/use-kitchen-queue-summary"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

/**
 * Adapted from shadcn's sidebar-07 block: kept the collapsible-to-icon
 * Sidebar primitive, dropped the block's sample team switcher and
 * projects list (this app is single-merchant, with no project concept),
 * and NavMain/NavUser are this app's own flat-nav / no-dropdown versions.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Today-only (no `all`) — the badge is "what needs attention right now",
  // matching the kitchen screen's default view. Cheap: the summary endpoint
  // is a single aggregate query, built specifically to be polled from here.
  const { data: kitchenSummary } = useKitchenQueueSummary({})

  // Nav entries are hidden only when the user can't view the page AT ALL
  // (reports without reports.view; settings without either of its two
  // sub-pages) — an entry a user can partly use (e.g. POS without
  // orders.void doesn't affect the POS entry, which only needs
  // orders.create) stays visible. Route guards (RequirePermission) are the
  // actual enforcement; this only keeps the sidebar from listing dead ends.
  const canViewReports = useCan("reports.view")
  const canViewProfile = useCan("profile.view")
  const canViewTeam = useCan("team.view")

  const navMain = [
    { title: "Dashboard", url: "/app/dashboard", icon: <LayoutDashboardIcon /> },
    { title: "POS", url: "/app/pos", icon: <CreditCardIcon /> },
    {
      // Label reads "Queue" — GASA merchants aren't all kitchens (coffee
      // shops, bakeries, canteens too); the route/module/hooks underneath
      // stay named kitchen-queue (out of scope for this rename).
      title: "Queue",
      url: "/app/kitchen-queue",
      icon: <ClockIcon />,
      // A badge draws attention to something needing action — an empty
      // queue needs none, so 0 hides it rather than showing an unreadable
      // "0" (undefined is also what NavMain treats as "no badge").
      badge: kitchenSummary?.pending_count ? kitchenSummary.pending_count : undefined,
    },
    { title: "Orders", url: "/app/orders", icon: <ClipboardListIcon /> },
    { title: "Products", url: "/app/products", icon: <PackageIcon /> },
    { title: "Ingredients", url: "/app/ingredients", icon: <BoxesIcon /> },
    { title: "Cash Drawer", url: "/app/cash-drawer", icon: <WalletIcon /> },
    ...(canViewReports
      ? [{ title: "Reports", url: "/app/reports", icon: <BarChart3Icon /> }]
      : []),
    ...(canViewProfile || canViewTeam
      ? [{ title: "Settings", url: "/app/settings", icon: <SettingsIcon /> }]
      : []),
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
              <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="size-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 2c2 2.5 3 5.5 3 8a3 3 0 1 1-6 0c0-2.5 1-5.5 3-8Zm0 20v-4m-4 4 1.5-3m6.5 3-1.5-3"
                  />
                </svg>
              </span>
              <span className="text-base font-bold leading-tight">
                <span className="text-primary">GASA</span> Merchant
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
