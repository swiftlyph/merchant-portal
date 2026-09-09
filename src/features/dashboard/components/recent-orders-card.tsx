import { Link } from "react-router-dom";
import { IconAlertTriangle, IconReceipt } from "@tabler/icons-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { formatDateTime } from "@/features/orders/format";
import { useOrders } from "@/features/orders/use-orders";

const RECENT_ORDERS_COUNT = 5;

/**
 * The five most recent orders (across any status/date — no filters, so a
 * quiet day still shows the last real activity). GET /merchant/orders
 * returns newest-first by default, so this is one small request
 * (per_page=5) with no client-side sorting.
 */
export function RecentOrdersCard() {
  const { data, isPending, isError, error, refetch } = useOrders({
    perPage: RECENT_ORDERS_COUNT,
    page: 1,
  });

  const orders = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent orders</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: RECENT_ORDERS_COUNT }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {!isPending && isError && (
          <div className="flex flex-col items-start gap-1.5">
            <div className="flex items-center gap-1.5 text-sm text-destructive">
              <IconAlertTriangle className="size-4 shrink-0" />
              {error instanceof Error ? error.message : "Couldn't load recent orders."}
            </div>
            <Button variant="ghost" size="xs" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!isPending && !isError && orders.length === 0 && (
          <div className="flex flex-col items-center gap-1 py-6 text-center">
            <IconReceipt className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">No orders yet</p>
            <p className="text-sm text-muted-foreground">Ring up your first sale.</p>
          </div>
        )}

        {!isPending && !isError && orders.length > 0 && (
          <ul className="flex flex-col gap-1">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/app/orders/${order.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-muted"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{order.order_number}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(order.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">{order.total_formatted}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <CardFooter>
        <Button variant="ghost" size="sm" className="w-full" asChild>
          <Link to="/app/orders">View all orders</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
