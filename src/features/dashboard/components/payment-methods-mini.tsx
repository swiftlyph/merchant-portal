import { IconAlertTriangle } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { PaymentMethodBucketKey, SalesSummary } from "@/features/reports/types";

const BUCKET_LABELS: Record<PaymentMethodBucketKey, string> = {
  cash: "Cash",
  gcash: "GCash",
  split: "Split",
};

/**
 * Dashboard-sized echo of reports' PaymentMethodBreakdown, reusing the same
 * sales-summary query the revenue stat card already fetches — no new
 * request, no new permission. Deliberately compact (no explanatory copy
 * about split orders here); /app/reports is one click away via the card
 * itself for anyone who needs that detail.
 */
export function PaymentMethodsMini({
  summary,
  isPending,
  isError,
  errorMessage,
  onRetry,
}: {
  summary: SalesSummary | undefined;
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Payment methods today</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {!isPending && isError && (
          <div className="flex flex-col items-start gap-1.5">
            <div className="flex items-center gap-1.5 text-sm text-destructive">
              <IconAlertTriangle className="size-4 shrink-0" />
              {errorMessage ?? "Couldn't load."}
            </div>
            <Button variant="ghost" size="xs" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}

        {!isPending && !isError && summary && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(Object.keys(BUCKET_LABELS) as PaymentMethodBucketKey[]).map((key) => {
              const bucket = summary.by_payment_method[key];
              return (
                <div key={key} className="flex items-center justify-between gap-2 rounded-2xl bg-muted px-3 py-2">
                  <span className="text-sm text-muted-foreground">{BUCKET_LABELS[key]}</span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-semibold tabular-nums">{bucket.amount_formatted}</span>
                    <span className="text-xs text-muted-foreground">
                      ({bucket.count})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
