import { IconShoppingCartOff } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/money";
import { CartLineItem } from "./cart-line-item";
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

export function CartPanel({ onCheckout }: { onCheckout: () => void }) {
  const { lines, discount_cents, setDiscountCents, clear } = useCartStore();
  const currency = lines[0]?.currency ?? "PHP";
  const subtotal = subtotalCents(lines);
  const total = totalCents(lines, discount_cents);
  const count = itemCount(lines);

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
            <CartLineItem key={line.localId} line={line} />
          ))}
        </ul>
      )}

      {lines.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatCents(subtotal, currency)}</span>
          </div>

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

          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatCents(total, currency)}</span>
          </div>

          <Button type="button" size="lg" className="h-14 text-base" onClick={onCheckout}>
            Charge {formatCents(total, currency)}
          </Button>
        </div>
      )}
    </div>
  );
}
