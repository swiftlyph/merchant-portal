import { useState } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useMenu } from "../use-menu";
import { useCartStore } from "../use-cart";
import { ProductGrid } from "../components/product-grid";
import { CartPanel } from "../components/cart-panel";
import { PaymentDialog } from "../components/payment-dialog";
import { SuccessDialog } from "../components/success-dialog";
import type { CheckoutResponse } from "../types";

/**
 * `/app/pos`. Two-column register: menu on the left, cart on the right,
 * stacking to a menu-with-cart-drawer on narrow screens (the cart panel
 * moves below the menu grid rather than off-canvas, since a barista on a
 * small tablet still needs the running total visible without an extra
 * tap). The cart itself is client state (zustand, see use-cart.ts) — menu
 * and checkout are the only server state here.
 */
export function PosPage() {
  const { data, isPending, isError, error, refetch } = useMenu();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CheckoutResponse | null>(null);

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
        <IconAlertTriangle className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Couldn't load the menu."}
        </p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      <div className="flex-1 lg:min-w-0">
        <ProductGrid
          products={data?.data ?? []}
          isLoading={isPending}
          onAdd={(product) => useCartStore.getState().addProduct(product)}
        />
      </div>

      <div className="flex w-full flex-col lg:w-96 lg:shrink-0">
        <CartPanel onCheckout={() => setPaymentOpen(true)} />
      </div>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onSuccess={(order) => setCompletedOrder(order)}
      />

      <SuccessDialog order={completedOrder} onNewOrder={() => setCompletedOrder(null)} />
    </div>
  );
}
