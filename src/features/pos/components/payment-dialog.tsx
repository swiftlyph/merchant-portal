import { useRef, useState } from "react";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCents } from "@/lib/money";
import { describeCheckoutError } from "../checkout-errors";
import { linesToCheckoutRequest } from "../use-checkout";
import { splitRemainderCents, subtotalCents, totalCents } from "../cart-math";
import { useCartStore } from "../use-cart";
import { useCheckout } from "../use-checkout";
import type { PaymentMethod } from "../types";
import type { CheckoutResponse } from "../types";

function pesosToCents(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function centsToPesosInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * The payment step — cash / gcash / split, then Charge. Owns nothing about
 * the idempotency key itself (that lives in useCheckout, scoped to the
 * whole attempt across retries); this only builds the request body from
 * cart + payment-method state and calls charge().
 */
export function PaymentDialog({
  open,
  onOpenChange,
  onSuccess,
  onUnavailableProducts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (order: CheckoutResponse) => void;
  /** Called with the product ids the server rejected as no-longer-available, so the cart can flag them. */
  onUnavailableProducts: (productIds: number[]) => void;
}) {
  const { lines, discount_cents, beneficiaries, clear } = useCartStore();
  const { charge, isPending, reset } = useCheckout();

  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cashInput, setCashInput] = useState("");
  const [gcashInput, setGcashInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Split payment: typing in one field auto-fills the other with whatever's
  // left of the total, so the cashier only ever has to type one number.
  // Editing the auto-filled field by hand stops it from being overwritten.
  const [gcashAutoFilled, setGcashAutoFilled] = useState(true);
  const [cashAutoFilled, setCashAutoFilled] = useState(true);

  // isPending from the mutation is the source of truth for disabling the
  // button, but it only updates on the NEXT render — a synchronous double
  // click within the same tick (e.g. an overzealous double-tap on a
  // tablet) could fire submit() twice before React commits that update.
  // This ref is checked and set synchronously, closing that gap: exactly
  // one request per gesture, never two.
  const inFlightRef = useRef(false);

  const currency = lines[0]?.currency ?? "PHP";
  const subtotal = subtotalCents(lines);
  const total = totalCents(lines, discount_cents);
  const cashCents = pesosToCents(cashInput);
  const gcashCents = pesosToCents(gcashInput);
  const remainder = splitRemainderCents(total, cashCents, gcashCents);
  const splitValid = method !== "split" || (remainder === 0 && cashCents > 0 && gcashCents > 0);

  function closeAndReset() {
    onOpenChange(false);
    setErrorMessage(null);
    setMethod("cash");
    setCashInput("");
    setGcashInput("");
    setGcashAutoFilled(true);
    setCashAutoFilled(true);
  }

  function handleCashChange(value: string) {
    setCashInput(value);
    setCashAutoFilled(false);
    if (gcashAutoFilled) {
      const remainder = total - pesosToCents(value);
      setGcashInput(remainder > 0 ? centsToPesosInput(remainder) : "");
    }
  }

  function handleGcashChange(value: string) {
    setGcashInput(value);
    setGcashAutoFilled(false);
    if (cashAutoFilled) {
      const remainder = total - pesosToCents(value);
      setCashInput(remainder > 0 ? centsToPesosInput(remainder) : "");
    }
  }

  async function submit() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setErrorMessage(null);

    const request = linesToCheckoutRequest(
      lines,
      method,
      discount_cents,
      method === "split" ? { cash_cents: cashCents, gcash_cents: gcashCents } : undefined,
      beneficiaries,
    );

    try {
      const order = await charge(request);
      clear();
      closeAndReset();
      onSuccess(order);
    } catch (error) {
      const info = describeCheckoutError(error);
      setErrorMessage(info.message);
      onUnavailableProducts(info.unavailableProductIds?.map(Number) ?? []);
      if (info.requiresNewKey) {
        reset();
      }
      // Otherwise the key is preserved in useCheckout's ref — the next tap
      // of Charge (same unchanged basket) resends the same Idempotency-Key,
      // exactly the retry path idempotency exists for.
    } finally {
      inFlightRef.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && (next ? onOpenChange(true) : closeAndReset())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Take payment</DialogTitle>
          <DialogDescription>This is the total to read aloud to the customer.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-1 rounded-2xl bg-muted/50 py-6">
          <span className="text-sm text-muted-foreground">Total due</span>
          <span className="text-4xl font-bold tabular-nums">{formatCents(total, currency)}</span>
          {discount_cents > 0 && (
            <span className="text-xs text-muted-foreground">
              Subtotal {formatCents(subtotal, currency)} − discount {formatCents(discount_cents, currency)}
            </span>
          )}
        </div>

        <Tabs value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
          <TabsList className="w-full">
            <TabsTrigger value="cash" className="flex-1">
              Cash
            </TabsTrigger>
            <TabsTrigger value="gcash" className="flex-1">
              GCash
            </TabsTrigger>
            <TabsTrigger value="split" className="flex-1">
              Split
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {method === "split" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="pos-split-cash" className="w-16 text-sm text-muted-foreground">
                Cash
              </label>
              <Input
                id="pos-split-cash"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={cashInput}
                onChange={(e) => handleCashChange(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="pos-split-gcash" className="w-16 text-sm text-muted-foreground">
                GCash
              </label>
              <Input
                id="pos-split-gcash"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={gcashInput}
                onChange={(e) => handleGcashChange(e.target.value)}
                className="h-10"
              />
            </div>
            <div
              className={
                remainder === 0
                  ? "text-sm font-medium text-primary"
                  : "text-sm font-medium text-destructive"
              }
              aria-live="polite"
            >
              {remainder === 0
                ? "Exact — ready to charge."
                : remainder > 0
                  ? `${formatCents(remainder, currency)} remaining`
                  : `${formatCents(-remainder, currency)} over the total`}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            size="lg"
            className="h-14 w-full text-base"
            disabled={isPending || !splitValid || lines.length === 0}
            onClick={() => void submit()}
          >
            {isPending ? (
              "Charging…"
            ) : (
              <>
                <IconCheck /> Charge {formatCents(total, currency)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
