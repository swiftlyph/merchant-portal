import { IconAlertTriangle } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { describeReportError } from "../errors";
import type { PaymentMethodBucketKey, SalesSummary } from "../types";

const BUCKET_LABELS: Record<PaymentMethodBucketKey, string> = {
  cash: "Cash",
  gcash: "GCash",
  split: "Split",
};

/**
 * Cash / GCash / split, each with count and amount. The one line of copy
 * below is deliberate, not decorative: `split.count` and `split.amount` are
 * NOT double-counted into cash/gcash — a split order's cash portion adds
 * into cash's amount, its gcash portion into gcash's amount, and its count
 * is only ever under `split`. That's the number that confuses people, so it
 * gets explained on the page rather than left to a tooltip.
 */
export function PaymentMethodBreakdown({
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
        <CardTitle>Payment methods</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {(Object.keys(BUCKET_LABELS) as PaymentMethodBucketKey[]).map((key) => {
                const bucket = summary.by_payment_method[key];
                return (
                  <div key={key} className="flex flex-col gap-1 rounded-2xl bg-muted p-4">
                    <span className="text-sm text-muted-foreground">{BUCKET_LABELS[key]}</span>
                    <span className="text-xl font-semibold tabular-nums">{bucket.amount_formatted}</span>
                    <span className="text-xs text-muted-foreground">
                      {bucket.count} {bucket.count === 1 ? "order" : "orders"}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              A split order pays with both cash and GCash — its cash portion is added to Cash's
              amount and its GCash portion to GCash's amount, but it is counted once, under Split,
              never under both.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
