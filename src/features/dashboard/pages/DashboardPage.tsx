import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** Placeholder solid-surface shell for "/app" — no auth guard or data yet. */
export function DashboardPage() {
  return (
    <div className="min-h-screen bg-base-200">
      <header className="navbar bg-base-100 shadow-sm">
        <div className="flex-1 px-2 text-lg font-semibold">GASA Merchant</div>
        <div className="flex-none">
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-col items-center justify-center gap-2 p-16 text-center">
        <h1 className="text-2xl font-bold">GASA merchant — coming soon</h1>
        <p className="text-base-content/70">
          The merchant dashboard will live here.
        </p>
      </main>
    </div>
  );
}
