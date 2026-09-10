import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { describeReportError } from "../errors";
import { formatCentsAxisTick, tooltipAmountFor } from "../sales-by-day-format";
import type { SalesByDayRow } from "../types";

const chartConfig = {
  net_cents: { label: "Net revenue", color: "var(--color-primary)" },
} satisfies ChartConfig;

function formatShortDate(dateParam: string): string {
  if (!dateParam) return "";
  const parts = dateParam.split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

/**
 * A bar per LOCAL day in range. Zero-sale days render as zero-height bars —
 * the API returns them for exactly this reason (see SalesByDayReport) —
 * never dropped, never collapsed into a gap. An accessible table of the
 * same rows sits behind a toggle so the data isn't chart-only.
 */
export function SalesByDayChart({
  rows,
  isPending,
  isError,
  error,
  onRetry,
}: {
  rows: SalesByDayRow[] | undefined;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
  onRetry: () => void;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales by day</CardTitle>
        {!isPending && !isError && rows && rows.length > 0 && (
          <CardAction>
            <Button variant="ghost" size="xs" onClick={() => setShowTable((v) => !v)}>
              {showTable ? "Show chart" : "Show table"}
            </Button>
          </CardAction>
        )}
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

        {!isPending && !isError && rows && rows.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No sales in this range.</p>
        )}

        {!isPending && !isError && rows && rows.length > 0 && !showTable && (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart data={rows} accessibilityLayer margin={{ left: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={formatCentsAxisTick}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => formatShortDate(String(label))}
                    formatter={(_value, _name, item) => {
                      const row = item.payload as SalesByDayRow;
                      return [tooltipAmountFor(row), chartConfig.net_cents.label];
                    }}
                  />
                }
              />
              <Bar dataKey="net_cents" fill="var(--color-net_cents)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}

        {!isPending && !isError && rows && rows.length > 0 && showTable && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Net revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{formatShortDate(row.date)}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.orders_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.net_formatted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
