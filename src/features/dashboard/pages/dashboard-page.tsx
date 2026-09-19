import {
  IconClockHour4,
  IconReceipt2,
  IconToolsKitchen2,
  IconCash,
  IconReportMoney,
} from "@tabler/icons-react";
import { useAuthStore, useCan } from "@/features/auth/store";
import { useMe } from "@/features/auth/use-me";
import { useKitchenQueueSummary } from "@/features/kitchen-queue/use-kitchen-queue-summary";
import { formatWaitingTime } from "@/features/kitchen-queue/waiting-time";
import { useSalesSummary } from "@/features/reports/use-sales-summary";
import { useTopItems } from "@/features/reports/use-top-items";
import { useIngredients } from "@/features/ingredients/use-ingredients";
import { todayDateParam } from "../today";
import { GreetingHeader } from "../components/greeting-header";
import { QuickActions } from "../components/quick-actions";
import { StatCard } from "../components/stat-card";
import { PaymentMethodsMini } from "../components/payment-methods-mini";
import { TopProductsChart } from "../components/top-products-chart";
import { LowStockCard } from "../components/low-stock-card";
import { RecentOrdersCard } from "../components/recent-orders-card";
import { useOrdersToday } from "../use-orders-today";

/** Small enough to be "the handful worth a glance," capped at MAX_LIMIT server-side anyway. */
const TOP_PRODUCTS_LIMIT = 5;
const LOW_STOCK_FETCH_COUNT = 5;

/**
 * `/app/dashboard`. `useMe` stays wired here as the one live, authenticated
 * request this page makes — see its docstring for why that matters beyond
 * just fetching the name: a revoked token 401s here and drives session
 * expiry via the normal registerOnUnauthorized path.
 *
 * Every number on this page is something GET /merchant/orders, the
 * kitchen-queue summary, the sales-summary/top-items reports, or
 * GET /merchant/ingredients can answer cheaply and exactly today — no
 * invented metrics, no client-side revenue aggregation.
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
  const canViewReports = useCan("reports.view");
  // The query is conditional too, not just the card — staff has no reason
  // to trigger a reports.view-gated request at all.
  const revenueToday = useSalesSummary({ from: today, to: today }, { enabled: canViewReports });
  const topProducts = useTopItems(
    { from: today, to: today, limit: TOP_PRODUCTS_LIMIT },
    { enabled: canViewReports },
  );

  // Two requests because GET /merchant/ingredients only filters by one
  // StockStatus at a time — same endpoint the Inventory page uses.
  const outOfStock = useIngredients({ status: "out_of_stock", perPage: LOW_STOCK_FETCH_COUNT });
  const lowStock = useIngredients({ status: "low_stock", perPage: LOW_STOCK_FETCH_COUNT });

  return (
    <div className="flex flex-col gap-6">
      <GreetingHeader userName={displayUser?.name} merchantName={displayUser?.merchant?.name} />

      <QuickActions />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* No revenue/average-order cards without reports.view — the other cards still fill the row. */}
        {canViewReports && (
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
        )}

        {canViewReports && (
          <StatCard
            label="Average order"
            icon={<IconReportMoney className="size-4" />}
            value={revenueToday.data?.average_order_formatted}
            isPending={revenueToday.isPending}
            isError={revenueToday.isError}
            errorMessage={
              revenueToday.error instanceof Error ? revenueToday.error.message : undefined
            }
            onRetry={() => void revenueToday.refetch()}
            href="/app/reports"
          />
        )}

        <StatCard
          label="Pending in queue"
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

      {/* Same reports.view gate and same query as the revenue/average-order cards above — no extra request. */}
      {canViewReports && (
        <PaymentMethodsMini
          summary={revenueToday.data}
          isPending={revenueToday.isPending}
          isError={revenueToday.isError}
          errorMessage={
            revenueToday.error instanceof Error ? revenueToday.error.message : undefined
          }
          onRetry={() => void revenueToday.refetch()}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {canViewReports && (
          <TopProductsChart
            items={topProducts.data?.data}
            isPending={topProducts.isPending}
            isError={topProducts.isError}
            error={topProducts.error}
            onRetry={() => void topProducts.refetch()}
          />
        )}

        <LowStockCard
          outOfStock={outOfStock.data?.data}
          lowStock={lowStock.data?.data}
          isPending={outOfStock.isPending || lowStock.isPending}
          isError={outOfStock.isError || lowStock.isError}
          errorMessage={
            outOfStock.error instanceof Error
              ? outOfStock.error.message
              : lowStock.error instanceof Error
                ? lowStock.error.message
                : undefined
          }
          onRetry={() => {
            void outOfStock.refetch();
            void lowStock.refetch();
          }}
        />
      </div>

      <RecentOrdersCard />
    </div>
  );
}
