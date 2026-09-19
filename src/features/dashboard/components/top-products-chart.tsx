import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { describeReportError } from "@/features/reports/errors";
import type { TopItemRow } from "@/features/reports/types";

const chartConfig = {
  quantity_sold: { label: "Quantity sold", color: "var(--color-primary)" },
} satisfies ChartConfig;

/** Longest label before it gets truncated with an ellipsis in the Y-axis tick. */
const MAX_LABEL_LENGTH = 18;

function truncateProductName(name: string): string {
  return name.length > MAX_LABEL_LENGTH ? `${name.slice(0, MAX_LABEL_LENGTH - 1)}…` : name;
}

/**
 * Today's best sellers by quantity sold, ranked highest-first — same rows
 * and same order as GET /merchant/reports/top-items (TopItemsReport sorts
 * server-side, never re-sorted here). Horizontal bars because product names
 * don't fit as X-axis ticks at a useful width.
 */
export function TopProductsChart({
  items,
  isPending,
  isError,
  error,
  onRetry,
}: {
  items: TopItemRow[] | undefined;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top products today</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending && <Skeleton className="h-64 w-full" />}

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

        {!isPending && !isError && items && items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No sales yet today.</p>
        )}

        {!isPending && !isError && items && items.length > 0 && (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart data={items} layout="vertical" accessibilityLayer margin={{ left: 12 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" dataKey="quantity_sold" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="product_name"
                tickFormatter={truncateProductName}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_label, payload) => {
                      const row = payload[0]?.payload as TopItemRow | undefined;
                      return row?.product_name ?? "";
                    }}
                    formatter={(value) => [`${value} sold`, chartConfig.quantity_sold.label]}
                  />
                }
              />
              <Bar dataKey="quantity_sold" fill="var(--color-quantity_sold)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
