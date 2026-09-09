import {
  LayoutDashboardIcon,
  CreditCardIcon,
  ClockIcon,
  ClipboardListIcon,
} from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
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

const NAV_MAIN = [
  { title: "Dashboard", url: "/app/dashboard", icon: <LayoutDashboardIcon /> },
  { title: "POS", url: "/app/pos", icon: <CreditCardIcon /> },
  { title: "Kitchen Queue", url: "/app/kitchen-queue", icon: <ClockIcon /> },
  { title: "Orders", url: "/app/orders", icon: <ClipboardListIcon /> },
]

/**
 * Adapted from shadcn's sidebar-07 block: kept the collapsible-to-icon
 * Sidebar primitive, dropped the block's sample team switcher and
 * projects list (this app is single-merchant, with no project concept),
 * and NavMain/NavUser are this app's own flat-nav / no-dropdown versions.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <NavMain items={NAV_MAIN} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
