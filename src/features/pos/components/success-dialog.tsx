import { IconCircleCheck } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCan } from "@/features/auth/store";
import type { CheckoutResponse } from "../types";

/**
 * Deliberately minimal — a queue of customers is waiting, so this is a
 * glance-and-go confirmation, not a receipt view. "New order" stays the
 * primary action; "Print receipt" (F11) is the one a cashier actually uses
 * mid-rush, so it's big and immediate rather than tucked into order detail
 * — it opens the same /app/orders/:id/receipt print view, just from here.
 */
export function SuccessDialog({
  order,
  onNewOrder,
}: {
  order: CheckoutResponse | null;
  onNewOrder: () => void;
}) {
  const navigate = useNavigate();
  const canPrintReceipt = useCan("orders.view");

  return (
    <Dialog open={order !== null} onOpenChange={(open) => !open && onNewOrder()}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          <IconCircleCheck className="size-12 text-primary" />
          <DialogTitle className="text-xl">Order placed</DialogTitle>
          <DialogDescription>Sent to the queue.</DialogDescription>
        </DialogHeader>

        {order && (
          <div className="flex flex-col items-center gap-1 py-4">
            <span className="text-sm text-muted-foreground">Order</span>
            <span className="text-3xl font-bold tracking-tight">{order.order_number}</span>
            <span className="mt-2 text-lg font-semibold tabular-nums">{order.total_formatted}</span>

            {/* F13/P10: brief, server-figure confirmation of the discount(s) actually applied — this is the FINAL server figure, never the cart's "estimated" one. */}
            {order.beneficiaries.length > 0 && (
              <ul className="mt-2 flex flex-col items-center gap-0.5 text-sm text-muted-foreground">
                {order.beneficiaries.map((beneficiary) => (
                  <li key={beneficiary.id}>
                    {beneficiary.name} — {beneficiary.discount_formatted} off
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {order && canPrintReceipt && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-14 w-full text-base"
              onClick={() => navigate(`/app/orders/${order.id}/receipt`)}
            >
              Print receipt
            </Button>
          )}
          <Button type="button" size="lg" className="h-14 w-full text-base" onClick={onNewOrder}>
            New order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
