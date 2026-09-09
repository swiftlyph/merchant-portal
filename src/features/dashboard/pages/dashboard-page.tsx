import { IconClockHour4, IconReceipt2, IconToolsKitchen2 } from "@tabler/icons-react";
import { useAuthStore } from "@/features/auth/store";
import { useMe } from "@/features/auth/use-me";
import { useKitchenQueueSummary } from "@/features/kitchen-queue/use-kitchen-queue-summary";
import { formatWaitingTime } from "@/features/kitchen-queue/waiting-time";
import { GreetingHeader } from "../components/greeting-header";
import { QuickActions } from "../components/quick-actions";
import { StatCard } from "../components/stat-card";
import { RecentOrdersCard } from "../components/recent-orders-card";
import { useOrdersToday } from "../use-orders-today";

/**
 * `/app/dashboard`. `useMe` stays wired here as the one live, authenticated
 * request this page makes — see its docstring for why that matters beyond
 * just fetching the name: a revoked token 401s here and drives session
 * expiry via the normal registerOnUnauthorized path.
 *
 * Every number on this page is something GET /merchant/orders or the
 * kitchen-queue summary can answer cheaply and exactly today — no invented
 * metrics, no client-side revenue aggregation. A "today's revenue" card
 * would need a reporting endpoint that doesn't exist yet; see the phase
 * summary for that gap.
 */
export function DashboardPage() {
  const storeUser = useAuthStore((s) => s.user);
  const { data: user } = useMe();
  const displayUser = user ?? storeUser;

  // "Today only" (all: false / omitted) — matches the Kitchen Queue page's
  // own default view, so this number and that screen's badge always agree.
  const kitchenSummary = useKitchenQueueSummary({});
  const ordersToday = useOrdersToday();

  return (
    <div className="flex flex-col gap-6">
      <GreetingHeader userName={displayUser?.name} merchantName={displayUser?.merchant?.name} />

      <QuickActions />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending in kitchen"
          icon={<IconToolsKitchen2 className="size-4" />}
          value={kitchenSummary.data?.pending_count}
          isPending={kitchenSummary.isPending}
          isError={kitchenSummary.isError}
          errorMessage={
            kitchenSummary.error instanceof Error ? kitchenSummary.error.message : undefined
          }
          onRetry={() => void kitchenSummary.refetch()}
        />

        <StatCard
          label="Longest wait"
          icon={<IconClockHour4 className="size-4" />}
          value={
            kitchenSummary.data?.oldest_waiting_seconds == null
              ? "None waiting"
              : formatWaitingTime(kitchenSummary.data.oldest_waiting_seconds)
          }
          isPending={kitchenSummary.isPending}
          isError={kitchenSummary.isError}
          errorMessage={
            kitchenSummary.error instanceof Error ? kitchenSummary.error.message : undefined
          }
          onRetry={() => void kitchenSummary.refetch()}
        />

        <StatCard
          label="Orders today"
          icon={<IconReceipt2 className="size-4" />}
          value={ordersToday.total}
          isPending={ordersToday.isPending}
          isError={ordersToday.isError}
          errorMessage={ordersToday.error instanceof Error ? ordersToday.error.message : undefined}
          onRetry={() => void ordersToday.refetch()}
        />
      </div>

      <RecentOrdersCard />
    </div>
  );
}
