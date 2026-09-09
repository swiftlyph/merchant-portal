import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { useKitchenQueue } from "../use-kitchen-queue";
import { useKitchenQueueSummary } from "../use-kitchen-queue-summary";
import { useViewMode } from "../use-view-mode";
import { TicketCard } from "../components/ticket-card";
import { TicketRow } from "../components/ticket-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function useAllDaysParam(): [boolean, (value: boolean) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const all = searchParams.get("all") === "1";

  function setAll(value: boolean) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("all", "1");
    } else {
      params.delete("all");
    }
    setSearchParams(params);
  }

  return [all, setAll];
}

/** "2 minutes ago" style, refreshed on its own 1s tick so it stays live without re-rendering the whole page. */
function useRelativeTime(timestamp: number | undefined): string {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timestamp) return "never";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

/** `/app/kitchen-queue`. */
export function KitchenQueuePage() {
  const [all, setAll] = useAllDaysParam();
  const [view, setView] = useViewMode();
  const filters = { all };

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useKitchenQueue(filters);
  const { data: summary } = useKitchenQueueSummary(filters);

  const lastUpdated = useRelativeTime(dataUpdatedAt || undefined);
  const orders = data?.data ?? [];
  const pendingCount = summary?.pending_count ?? orders.length;
  const isTruncated = pendingCount > orders.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Kitchen Queue</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{pendingCount} pending</Badge>
            <span>Updated {lastUpdated}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "tickets" | "table")}>
            <TabsList>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant={all ? "secondary" : "outline"}
            size="sm"
            onClick={() => setAll(!all)}
            aria-pressed={all}
          >
            {all ? "All days" : "Today only"}
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Refresh queue"
          >
            <IconRefresh className={isFetching ? "animate-spin" : undefined} />
          </Button>
        </div>
      </div>

      {isTruncated && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <IconAlertTriangle className="size-4 shrink-0" />
          Showing first {orders.length} of {pendingCount} pending orders.
        </div>
      )}

      {isPending && <KitchenQueueSkeleton view={view} />}

      {isError && !data && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Couldn't load the kitchen queue."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}

      {isError && data && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <IconAlertTriangle className="size-4 shrink-0" />
          Couldn't refresh — showing the last known queue.
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isPending && data && orders.length === 0 && (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium">No orders in the queue</p>
          <p className="text-sm text-muted-foreground">
            {all ? "Nothing pending." : "Nothing pending today. Try “All days” for older orders."}
          </p>
        </div>
      )}

      {!isPending && data && orders.length > 0 && view === "tickets" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => (
            <TicketCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {!isPending && data && orders.length > 0 && view === "table" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Waiting</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TicketRow key={order.id} order={order} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function KitchenQueueSkeleton({ view }: { view: "tickets" | "table" }) {
  if (view === "table") {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  );
}
