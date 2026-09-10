import { Link, Outlet, useMatches } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface RouteHandle {
  title?: string;
  /** Set on a detail-style route (e.g. order detail) to show a two-level trail. */
  parentTitle?: string;
  parentPath?: string;
}

/**
 * Authenticated app shell: collapsible-to-icon left nav rail (AppSidebar,
 * from shadcn's sidebar-07 block) + scrollable content area for the nested
 * /app/* routes. Each route under here supplies just its own page content
 * via <Outlet />. Header matches sidebar-07's reference layout (h-16/h-12
 * collapsed, trigger + separator + breadcrumb) rather than a bare bar.
 *
 * Named (and structured) after sidebar-07's own app/dashboard/page.tsx —
 * that file *is* this same SidebarProvider/AppSidebar/SidebarInset wrapper,
 * just inlined per-route because Next.js's App Router does layouts that
 * way. This app has four routes sharing one sidebar, so the wrapper lives
 * here once instead of being copy-pasted into every page.
 */
export function DashboardLayout() {
  const matches = useMatches();
  const handle =
    matches
      .slice()
      .reverse()
      .find((m) => (m.handle as RouteHandle | undefined)?.title)?.handle as
      | RouteHandle
      | undefined;

  return (
    <SidebarProvider>
      <AppSidebar className="print-hide" />
      <SidebarInset>
        <header className="print-hide flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex flex-1 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {handle?.parentTitle && (
                  <>
                    <BreadcrumbItem className="hidden md:block">
                      {handle.parentPath ? (
                        <BreadcrumbLink asChild>
                          <Link to={handle.parentPath}>{handle.parentTitle}</Link>
                        </BreadcrumbLink>
                      ) : (
                        handle.parentTitle
                      )}
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                  </>
                )}
                <BreadcrumbItem>
                  <BreadcrumbPage>{handle?.title ?? "GASA Merchant"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="px-4">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
