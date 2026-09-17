import { Link, useMatch } from "react-router-dom"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavMainItem {
  title: string
  url: string
  icon?: React.ReactNode
  /**
   * e.g. the kitchen queue's pending count. undefined hides the badge —
   * both while there's no data yet and once a caller decides 0 has
   * nothing worth flagging (see AppSidebar), since a bare "0" reads as
   * "no badge" against the sidebar background anyway.
   */
  badge?: number
}

/**
 * Flat top-level nav — no sub-items, unlike the stock sidebar-07 block
 * (Playground/Models/etc. with Collapsible groups). This app's nav is one
 * level: Dashboard, POS, Queue, Orders, Products, Ingredients, Cash Drawer,
 * Reports, Settings.
 */
export function NavMain({ items }: { items: NavMainItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <NavMainMenuItem key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavMainMenuItem({ item }: { item: NavMainItem }) {
  // `/*` so an item whose page has its own sub-routes (e.g. Settings'
  // /app/settings/profile, /app/settings/team) still shows active —
  // useMatch's default is an exact match on item.url alone.
  const exactMatch = useMatch(item.url)
  const subMatch = useMatch(`${item.url}/*`)
  const isActive = Boolean(exactMatch) || Boolean(subMatch)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
        <Link to={item.url}>
          {item.icon}
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
      {item.badge !== undefined && (
        <SidebarMenuBadge aria-label={`${item.badge} pending in ${item.title}`}>
          {item.badge}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  )
}
