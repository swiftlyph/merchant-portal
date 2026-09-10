import { IconAlertTriangle } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { describeReportError } from "../errors";
import type { SalesSummary } from "../types";

function StatTile({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string | number;
  emphasize?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={emphasize ? "text-3xl font-bold tabular-nums" : "text-xl font-semibold tabular-nums"}>
        {value}
      </span>
    </div>
  );
}

/**
 * Net revenue is the headline; gross, discounts, orders, average order, and
 * voided count follow. Voided count is presented as a neutral operational
 * figure (same tile styling as everything else) — never styled as an error,
 * since a void is a normal counter-service outcome, not a failure.
 */
export function SummaryCards({
  summary,
  isPending,
  isError,
  error,
  onRetry,
}: {
  summary: SalesSummary | undefined;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales summary</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}

        {!isPending && isError && (
          <div className="flex flex-col items-start gap-1.5">
            <div className="flex items-center gap-1.5 text-sm text-destructive">
              <IconAlertTriangle className="size-4 shrink-0" />
              {describeReportError(error)}
            </div>
            <Button variant="ghost" size="xs" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}

        {!isPending && !isError && summary && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Net revenue" value={summary.net_formatted} emphasize />
            <StatTile label="Gross revenue" value={summary.gross_formatted} />
            <StatTile label="Discounts" value={summary.discount_formatted} />
            <StatTile label="Orders" value={summary.orders_count} />
            <StatTile label="Average order" value={summary.average_order_formatted} />
            <StatTile label="Voided" value={summary.voided_count} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
