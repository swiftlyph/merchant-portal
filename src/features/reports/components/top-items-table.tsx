import { IconAlertTriangle } from "@tabler/icons-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { describeReportError } from "../errors";
import type { TopItemRow } from "../types";

/** Within TopItemsReport::MAX_LIMIT (50). */
const LIMIT_OPTIONS = [10, 25, 50] as const;

export function TopItemsTable({
  items,
  isPending,
  isError,
  error,
  onRetry,
  limit,
  onLimitChange,
}: {
  items: TopItemRow[] | undefined;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
  onRetry: () => void;
  limit: number;
  onLimitChange: (limit: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top items</CardTitle>
        <CardAction>
          <Tabs value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
            <TabsList>
              {LIMIT_OPTIONS.map((option) => (
                <TabsTrigger key={option} value={String(option)}>
                  {option}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
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

        {!isPending && !isError && items && items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No items sold in this range.
          </p>
        )}

        {!isPending && !isError && items && items.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity sold</TableHead>
                  <TableHead className="text-right">Net revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={`${item.product_name}-${index}`}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity_sold}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.net_formatted}</TableCell>
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
