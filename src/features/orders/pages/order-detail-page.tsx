import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useOrder } from "../use-order";
import { useCompleteOrder, useVoidOrder } from "../use-order-transitions";
import { OrderStatusBadge } from "../components/order-status-badge";
import { PAYMENT_METHOD_LABEL, formatDateTime } from "../format";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** `/app/orders/:id`. */
export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = id ?? "";
  const { data: order, isPending, isError, error } = useOrder(orderId);

  const completeMutation = useCompleteOrder(orderId);
  const voidMutation = useVoidOrder(orderId);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm font-medium">
          {notFound ? "Order not found" : "Couldn't load this order"}
        </p>
        <p className="text-sm text-muted-foreground">
          {notFound
            ? "This order doesn't exist or doesn't belong to your account."
            : error instanceof Error
              ? error.message
              : "Something went wrong."}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  if (!order) return null;

  async function handleComplete() {
    try {
      await completeMutation.mutateAsync();
      toast.success(`Order ${order?.order_number} completed.`);
    } catch (err) {
      if (!(err instanceof ApiError && err.code === "invalid_transition")) {
        toast.error(err instanceof Error ? err.message : "Couldn't complete this order.");
      }
    } finally {
      setCompleteOpen(false);
    }
  }

  async function handleVoid() {
    try {
      await voidMutation.mutateAsync();
      toast.success(`Order ${order?.order_number} voided.`);
    } catch (err) {
      if (!(err instanceof ApiError && err.code === "invalid_transition")) {
        toast.error(err instanceof Error ? err.message : "Couldn't void this order.");
      }
    } finally {
      setVoidOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <OrderStatusBadge status={order.status} />
            <span>Placed {formatDateTime(order.created_at)}</span>
          </div>
        </div>

        {order.status === "pending" && (
          <div className="flex gap-2">
            <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Void</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Void this order?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cannot be undone. The order will be marked voided and can't be
                    changed again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={voidMutation.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      void handleVoid();
                    }}
                  >
                    {voidMutation.isPending ? "Voiding…" : "Void order"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={completeOpen} onOpenChange={setCompleteOpen}>
              <AlertDialogTrigger asChild>
                <Button>Complete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Complete this order?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This marks the order as completed and can't be changed again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={completeMutation.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      void handleComplete();
                    }}
                  >
                    {completeMutation.isPending ? "Completing…" : "Complete order"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Unit price</TableHead>
            <TableHead>Line total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span>{item.product_name}</span>
                  {item.add_ons.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {item.add_ons
                        .map((addOn) => `${addOn.name} (+${addOn.price_formatted})`)
                        .join(", ")}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>{item.unit_price_formatted}</TableCell>
              <TableCell>{item.line_total_formatted}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-1 text-sm">
          <div className="text-muted-foreground">Payment method</div>
          <div className="font-medium">{PAYMENT_METHOD_LABEL[order.payment_method]}</div>
          {order.payment_method === "split" && (
            <div className="text-muted-foreground">
              Cash {order.cash_formatted ?? "—"} · GCash {order.gcash_formatted ?? "—"}
            </div>
          )}
          {order.completed_at && (
            <div className="text-muted-foreground">
              Completed {formatDateTime(order.completed_at)}
            </div>
          )}
          {order.voided_at && (
            <div className="text-muted-foreground">Voided {formatDateTime(order.voided_at)}</div>
          )}
        </div>

        <div className="flex w-full max-w-xs flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{order.subtotal_formatted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span>-{order.discount_formatted}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>{order.total_formatted}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
