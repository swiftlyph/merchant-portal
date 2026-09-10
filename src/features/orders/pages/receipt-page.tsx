import { Link, useParams } from "react-router-dom";
import { useReceipt } from "../use-receipt";
import { ReceiptContent } from "../components/receipt-content";
import { PrintFrame } from "@/components/print-frame";
import { PrintButton } from "@/components/print-button";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/app/orders/:id/receipt` — a bare, chrome-free print view (not nested
 * under DashboardLayout: no sidebar/header even renders here, rather than
 * relying only on print CSS to hide it). Reached from the order detail
 * page's "Print receipt" button, and reprintable any time after — the
 * payload is always current (live merchant profile, order line snapshot),
 * so a reprint of a voided order always shows VOIDED.
 */
export function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = id ?? "";
  const { data: receipt, isPending, isError, error } = useReceipt(orderId);

  if (isPending) {
    return (
      <div className="mx-auto flex max-w-[80mm] flex-col gap-3 p-4">
        <Skeleton className="h-8 w-full" />
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
          {notFound ? "Order not found" : "Couldn't load this receipt"}
        </p>
        <p className="text-sm text-muted-foreground">
          {notFound
            ? "This order doesn't exist or doesn't belong to your account."
            : error instanceof Error
              ? error.message
              : "Something went wrong."}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to={`/app/orders/${orderId}`}>Back to order</Link>
        </Button>
      </div>
    );
  }

  if (!receipt) return null;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="print-hide flex w-full max-w-[80mm] justify-end">
        <PrintButton label="Print receipt" />
      </div>
      <PrintFrame>
        <ReceiptContent receipt={receipt} />
      </PrintFrame>
    </div>
  );
}
