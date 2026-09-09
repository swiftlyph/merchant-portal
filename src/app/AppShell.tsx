import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/ui/Sidebar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * Authenticated app shell: fixed left nav rail (Sidebar) + scrollable
 * content area for the nested /app/* routes. Replaces DashboardPage's
 * former all-in-one layout — each route under here now supplies just its
 * own page content via <Outlet />.
 */
export function AppShell() {
  return (
    <div className="flex min-h-screen bg-muted/40">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end border-b border-border bg-background px-4">
          <ThemeToggle />
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
