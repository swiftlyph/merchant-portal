import { useState } from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import { isRangeWithinLimit } from "../date-range";
import { useReportRange } from "../use-report-range";
import { useSalesSummary } from "../use-sales-summary";
import { useSalesByDay } from "../use-sales-by-day";
import { useTopItems } from "../use-top-items";
import { ReportRangePicker } from "../components/report-range-picker";
import { SummaryCards } from "../components/summary-cards";
import { PaymentMethodBreakdown } from "../components/payment-method-breakdown";
import { SalesByDayChart } from "../components/sales-by-day-chart";
import { TopItemsTable } from "../components/top-items-table";

/**
 * /app/reports — the screen an owner opens in the morning. All three
 * sections (summary, sales-by-day, top-items) share ONE range, sourced from
 * the URL via useReportRange, so they can never describe different periods
 * and a view survives a refresh. The client-side range guard
 * (isRangeWithinLimit) blocks an obviously-too-large custom range before it
 * reaches the server; each section still handles the server's own
 * `range_too_large` 422 independently, since the guard can't catch a range
 * typed straight into the URL.
 */
export function ReportsPage() {
  const { range, setRange } = useReportRange();
  const [limit, setLimit] = useState(10);

  const withinLimit = isRangeWithinLimit(range.from, range.to);

  const summary = useSalesSummary(range, { enabled: withinLimit });
  const byDay = useSalesByDay(range, { enabled: withinLimit });
  const topItems = useTopItems({ ...range, limit }, { enabled: withinLimit });

  const isRangeChanging = summary.isFetching || byDay.isFetching || topItems.isFetching;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Sales for the selected range, straight from the register — no estimates.
          </p>
        </div>
        <ReportRangePicker range={range} onChange={setRange} disabled={isRangeChanging} />
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
        <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
        <p>
          Pending orders count as revenue — this is counter service, the customer paid when the
          order was placed. Voided orders are excluded from every revenue figure but still counted
          separately as voids.
        </p>
      </div>

      {!withinLimit ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          That range is too large to report on. Choose a narrower range above.
        </div>
      ) : (
        <>
          <SummaryCards
            summary={summary.data}
            isPending={summary.isPending}
            isError={summary.isError}
            error={summary.error}
            onRetry={() => void summary.refetch()}
          />

          <PaymentMethodBreakdown
            summary={summary.data}
            isPending={summary.isPending}
            isError={summary.isError}
            error={summary.error}
            onRetry={() => void summary.refetch()}
          />

          <SalesByDayChart
            rows={byDay.data?.data}
            isPending={byDay.isPending}
            isError={byDay.isError}
            error={byDay.error}
            onRetry={() => void byDay.refetch()}
          />

          <TopItemsTable
            items={topItems.data?.data}
            isPending={topItems.isPending}
            isError={topItems.isError}
            error={topItems.error}
            onRetry={() => void topItems.refetch()}
            limit={limit}
            onLimitChange={setLimit}
          />
        </>
      )}
    </div>
  );
}
