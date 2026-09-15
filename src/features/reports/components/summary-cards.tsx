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
 * True when at least one order in the range was VAT-registered. Checked
 * off the three VAT-only figures rather than `discount_cents` or the
 * gross total, so a range with statutory discounts but no VAT-registered
 * merchant (a non-VAT shop's senior/PWD sales) still correctly omits the
 * VAT row (F13/P10 rule: never show VAT figures as zero — omit instead).
 */
function hasVatRegisteredSales(summary: SalesSummary): boolean {
  return summary.vatable_sales_cents > 0 || summary.vat_cents > 0 || summary.vat_exempt_sales_cents > 0;
}

/**
 * Net revenue is the headline; gross, discounts, orders, average order, and
 * voided count follow. Voided count is presented as a neutral operational
 * figure (same tile styling as everything else) — never styled as an error,
 * since a void is a normal counter-service outcome, not a failure.
 *
 * F13/P10 extends this SAME card — statutory/promo discount tiles fold into
 * the existing grid, and a VAT summary row appears below it only when the
 * range actually contains VAT-registered sales (see hasVatRegisteredSales);
 * a range with none omits the row entirely rather than showing zeros.
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
      <CardContent className="flex flex-col gap-4">
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
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile label="Net revenue" value={summary.net_formatted} emphasize />
              <StatTile label="Gross revenue" value={summary.gross_formatted} />
              <StatTile label="Discounts" value={summary.discount_formatted} />
              <StatTile label="Orders" value={summary.orders_count} />
              <StatTile label="Average order" value={summary.average_order_formatted} />
              <StatTile label="Voided" value={summary.voided_count} />
            </div>

            {/*
              F13/P10: the two causes behind the Discounts tile above —
              EACH shown only when it individually applies (not "either"),
              so a range with only a promo discount never also displays a
              zeroed-out Senior/PWD tile, and vice versa. A range with
              neither keeps the grid exactly as it looked before this
              phase.
            */}
            {(summary.statutory_discount_cents > 0 || summary.promo_discount_cents > 0) && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {summary.statutory_discount_cents > 0 && (
                  <StatTile label="Senior/PWD discount" value={summary.statutory_discount_formatted} />
                )}
                {summary.promo_discount_cents > 0 && (
                  <StatTile label="Promo discount" value={summary.promo_discount_formatted} />
                )}
              </div>
            )}

            {hasVatRegisteredSales(summary) && (
              <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-3">
                <span className="text-sm font-medium">VAT summary</span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <StatTile label="VATable sales" value={summary.vatable_sales_formatted} />
                  <StatTile label="VAT" value={summary.vat_formatted} />
                  <StatTile label="VAT-exempt sales" value={summary.vat_exempt_sales_formatted} />
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
