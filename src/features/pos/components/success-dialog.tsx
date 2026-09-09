import { IconCircleCheck } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CheckoutResponse } from "../types";

/**
 * Deliberately minimal — a queue of customers is waiting, so this is a
 * glance-and-go confirmation, not a receipt. "New order" is the only
 * action; there's nowhere else this screen needs to send anyone.
 */
export function SuccessDialog({
  order,
  onNewOrder,
}: {
  order: CheckoutResponse | null;
  onNewOrder: () => void;
}) {
  return (
    <Dialog open={order !== null} onOpenChange={(open) => !open && onNewOrder()}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          <IconCircleCheck className="size-12 text-primary" />
          <DialogTitle className="text-xl">Order placed</DialogTitle>
          <DialogDescription>Sent to the kitchen queue.</DialogDescription>
        </DialogHeader>

        {order && (
          <div className="flex flex-col items-center gap-1 py-4">
            <span className="text-sm text-muted-foreground">Order</span>
            <span className="text-3xl font-bold tracking-tight">{order.order_number}</span>
            <span className="mt-2 text-lg font-semibold tabular-nums">{order.total_formatted}</span>
          </div>
        )}

        <DialogFooter>
          <Button type="button" size="lg" className="h-14 w-full text-base" onClick={onNewOrder}>
            New order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
