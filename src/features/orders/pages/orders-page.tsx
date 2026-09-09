import { useNavigate, useSearchParams } from "react-router-dom";
import { useOrders } from "../use-orders";
import { OrderStatusBadge } from "../components/order-status-badge";
import { PAYMENT_METHOD_LABEL, formatDateTime } from "../format";
import type { OrderStatus } from "../types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "voided", label: "Voided" },
];

function isOrderStatus(value: string): value is OrderStatus {
  return value === "pending" || value === "completed" || value === "voided";
}

/**
 * `/app/orders`. Status/date/page live in the URL (?status=&date=&page=) and
 * drive the server query, so a refresh or a shared link restores exactly
 * that view — nothing here lives in useState, per the TanStack-Query-for-
 * all-server-state rule. The order-number search box (?q=) is the one
 * exception: the backend contract has no search param, so it's a client-
 * side filter over the already-fetched page rather than a server query —
 * still kept in the URL for the same shareable/refreshable reason, it's
 * just not passed to useOrders.
 */
export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const statusParam = searchParams.get("status") ?? "all";
  const dateParam = searchParams.get("date") ?? "";
  const queryParam = searchParams.get("q") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const filters = {
    status: isOrderStatus(statusParam) ? statusParam : undefined,
    date: dateParam || undefined,
    page,
  };

  const { data, isPending, isError, error, refetch, isFetching } = useOrders(filters);

  const normalizedQuery = queryParam.trim().toLowerCase();
  const visibleOrders = normalizedQuery
    ? (data?.data ?? []).filter((order) =>
        order.order_number.toLowerCase().includes(normalizedQuery),
      )
    : (data?.data ?? []);

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    setSearchParams(params);
  }

  function handleStatusChange(value: string) {
    updateParams({ status: value === "all" ? null : value, page: null });
  }

  function handleDateChange(value: string) {
    updateParams({ date: value || null, page: null });
  }

  function handleQueryChange(value: string) {
    updateParams({ q: value || null });
  }

  function goToPage(nextPage: number) {
    updateParams({ page: nextPage > 1 ? String(nextPage) : null });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Browse and manage orders placed on this merchant.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="orders-search" className="text-xs text-muted-foreground">
            Search
          </label>
          <Input
            id="orders-search"
            type="search"
            placeholder="Order number…"
            className="w-48"
            value={queryParam}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="orders-status-filter" className="text-xs text-muted-foreground">
            Status
          </label>
          <Select value={statusParam} onValueChange={handleStatusChange}>
            <SelectTrigger id="orders-status-filter" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="orders-date-filter" className="text-xs text-muted-foreground">
            Date
          </label>
          <Input
            id="orders-date-filter"
            type="date"
            className="w-40"
            value={dateParam}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>

        {(statusParam !== "all" || dateParam || queryParam) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateParams({ status: null, date: null, q: null, page: null })}
          >
            Clear filters
          </Button>
        )}
      </div>

      {isPending && <OrdersTableSkeleton />}

      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Couldn't load orders."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isPending && !isError && data && visibleOrders.length === 0 && (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium">No orders found</p>
          <p className="text-sm text-muted-foreground">
            {normalizedQuery
              ? `No orders on this page match "${queryParam}".`
              : "Try a different status or date filter."}
          </p>
        </div>
      )}

      {!isPending && !isError && data && visibleOrders.length > 0 && (
        <>
          <Table className={isFetching ? "opacity-60 transition-opacity" : undefined}>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/app/orders/${order.id}`)}
                >
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{formatDateTime(order.created_at)}</TableCell>
                  <TableCell>{order.items.length}</TableCell>
                  <TableCell>{PAYMENT_METHOD_LABEL[order.payment_method]}</TableCell>
                  <TableCell>{order.total_formatted}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data.meta.last_page > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={page <= 1}
                    className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) goToPage(page - 1);
                    }}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-2 text-sm text-muted-foreground">
                    Page {data.meta.current_page} of {data.meta.last_page}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-disabled={page >= data.meta.last_page}
                    className={
                      page >= data.meta.last_page ? "pointer-events-none opacity-50" : undefined
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < data.meta.last_page) goToPage(page + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}

function OrdersTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
