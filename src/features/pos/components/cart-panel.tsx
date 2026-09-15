import { useState } from "react";
import { IconAlertTriangle, IconShoppingCartOff } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/money";
import { CartLineItem } from "./cart-line-item";
import { BeneficiaryDialog } from "./beneficiary-dialog";
import { BeneficiaryList } from "./beneficiary-list";
import { itemCount, subtotalCents, totalCents } from "../cart-math";
import { useCartStore } from "../use-cart";

/**
 * Discount is entered in peso/currency terms (what a cashier actually
 * types, e.g. "20" for a ₱20 discount) and converted to integer cents right
 * at the boundary — never stored or compared as a float.
 */
function pesosToCents(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/** Quick-pick discount chips — cents are derived from the current subtotal at click time, tapping again clears it. */
const DISCOUNT_PRESETS: { label: string; cents: (subtotal_cents: number) => number }[] = [
  { label: "10%", cents: (subtotal) => Math.round(subtotal * 0.1) },
  { label: "20%", cents: (subtotal) => Math.round(subtotal * 0.2) },
];

export function CartPanel({
  onCheckout,
  unavailableProductIds = [],
}: {
  onCheckout: () => void;
  /** Product ids the last checkout attempt rejected as no-longer-available — flagged on their cart line. */
  unavailableProductIds?: number[];
}) {
  const { lines, discount_cents, setDiscountCents, clear, beneficiaries, addBeneficiary } =
    useCartStore();
  const [beneficiaryDialogOpen, setBeneficiaryDialogOpen] = useState(false);
  const currency = lines[0]?.currency ?? "PHP";
  const subtotal = subtotalCents(lines);
  const total = totalCents(lines, discount_cents);
  const count = itemCount(lines);

  // F13/P10: mirrors the backend's own `beneficiary_unused` 422
  // client-side — a beneficiary with no line assigned to them cannot be
  // confirmed into the order (see BeneficiaryList, which also flags this
  // inline per-beneficiary). The server still enforces this
  // independently regardless (see PaymentDialog's error handling), since
  // a beneficiary could in principle lose their last line between this
  // render and the request going out.
  const hasUnusedBeneficiary = beneficiaries.some(
    (b) => !lines.some((line) => line.beneficiaryLocalId === b.localId),
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Cart {count > 0 && <span className="text-muted-foreground">({count})</span>}</h2>
        {lines.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            Clear
          </Button>
        )}
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <IconShoppingCartOff className="size-8" />
          <p className="text-sm">Tap a menu item to start an order.</p>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {lines.map((line) => (
            <CartLineItem
              key={line.localId}
              line={line}
              unavailable={unavailableProductIds.includes(line.product_id)}
            />
          ))}
        </ul>
      )}

      {lines.length > 0 && (
        <BeneficiaryList onAddClick={() => setBeneficiaryDialogOpen(true)} />
      )}

      <BeneficiaryDialog
        open={beneficiaryDialogOpen}
        onOpenChange={setBeneficiaryDialogOpen}
        onAdd={addBeneficiary}
      />

      {lines.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatCents(subtotal, currency)}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <label htmlFor="pos-discount" className="text-muted-foreground">
                Discount
              </label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">₱</span>
                <Input
                  id="pos-discount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="h-8 w-24 text-right"
                  value={discount_cents === 0 ? "" : (discount_cents / 100).toString()}
                  onChange={(e) => setDiscountCents(pesosToCents(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            </div>
            {/* F13/P10: this discount is applied AFTER any senior/PWD discount above, off what's left of the subtotal. */}
            <p className="text-right text-xs text-muted-foreground">
              Applies after any senior/PWD discount.
            </p>

            {subtotal > 0 && (
              <div className="flex flex-wrap justify-end gap-1.5">
                {DISCOUNT_PRESETS.map((preset) => {
                  const presetCents = preset.cents(subtotal);
                  const active = discount_cents === presetCents;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      className={
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium " +
                        (active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted")
                      }
                      onClick={() => setDiscountCents(active ? 0 : presetCents)}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatCents(total, currency)}</span>
          </div>

          {hasUnusedBeneficiary && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
              <IconAlertTriangle className="size-4 shrink-0" />
              Assign an item to every senior/PWD discount before charging.
            </div>
          )}

          <Button
            type="button"
            size="lg"
            className="h-14 text-base"
            onClick={onCheckout}
            disabled={hasUnusedBeneficiary}
          >
            Charge {formatCents(total, currency)}
          </Button>
        </div>
      )}
    </div>
  );
}
