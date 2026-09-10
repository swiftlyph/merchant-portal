import { IconClockHour4, IconReceipt2, IconToolsKitchen2, IconCash } from "@tabler/icons-react";
import { useAuthStore } from "@/features/auth/store";
import { useMe } from "@/features/auth/use-me";
import { useKitchenQueueSummary } from "@/features/kitchen-queue/use-kitchen-queue-summary";
import { formatWaitingTime } from "@/features/kitchen-queue/waiting-time";
import { useSalesSummary } from "@/features/reports/use-sales-summary";
import { todayDateParam } from "../today";
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
 * Every number on this page is something GET /merchant/orders, the
 * kitchen-queue summary, or (as of P6/F8) the sales-summary report can
 * answer cheaply and exactly today — no invented metrics, no client-side
 * revenue aggregation.
 */
export function DashboardPage() {
  const storeUser = useAuthStore((s) => s.user);
  const { data: user } = useMe();
  const displayUser = user ?? storeUser;

  // "Today only" (all: false / omitted) — matches the Kitchen Queue page's
  // own default view, so this number and that screen's badge always agree.
  const kitchenSummary = useKitchenQueueSummary({});
  const ordersToday = useOrdersToday();
  const today = todayDateParam();
  const revenueToday = useSalesSummary({ from: today, to: today });

  return (
    <div className="flex flex-col gap-6">
      <GreetingHeader userName={displayUser?.name} merchantName={displayUser?.merchant?.name} />

      <QuickActions />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard
          label="Revenue today"
          icon={<IconCash className="size-4" />}
          value={revenueToday.data?.net_formatted}
          isPending={revenueToday.isPending}
          isError={revenueToday.isError}
          errorMessage={
            revenueToday.error instanceof Error ? revenueToday.error.message : undefined
          }
          onRetry={() => void revenueToday.refetch()}
          href="/app/reports"
        />

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
