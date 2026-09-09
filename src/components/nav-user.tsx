import { LogOutIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/features/auth/store"
import { useMe } from "@/features/auth/use-me"
import { useLogout } from "@/features/auth/use-logout"

/**
 * Footer identity + logout — simplified from the stock sidebar-07 NavUser
 * (no dropdown menu: no Upgrade to Pro/Billing/Notifications, none of which
 * this app has). Just who's signed in, and a direct logout action.
 */
export function NavUser() {
  const storeUser = useAuthStore((s) => s.user)
  const { data: user } = useMe()
  const logout = useLogout()

  const displayUser = user ?? storeUser

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarFallback className="rounded-lg bg-secondary font-semibold text-secondary-foreground">
              {(displayUser?.name ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{displayUser?.name ?? "…"}</span>
            <span className="truncate text-xs text-muted-foreground">
              {displayUser?.merchant?.name ?? "Merchant"}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip="Logout"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOutIcon />
          <span>Logout</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
