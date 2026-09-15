import { useState } from "react";
import { IconAlertTriangle, IconChevronDown, IconMinus, IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import { AddOnEditor } from "./add-on-editor";
import { lineTotalCents } from "../cart-math";
import { useCartStore } from "../use-cart";
import type { CartLine } from "../cart-types";

export function CartLineItem({
  line,
  unavailable = false,
}: {
  line: CartLine;
  /** True when the last checkout attempt rejected this product as no-longer-available. */
  unavailable?: boolean;
}) {
  const { setQuantity, removeLine, addAddOn, removeAddOn } = useCartStore();
  const [addOnsOpen, setAddOnsOpen] = useState(false);

  return (
    <li
      className={
        "flex flex-col gap-2 rounded-xl border bg-card p-3" +
        (unavailable ? " border-destructive/60 bg-destructive/5" : " border-border")
      }
    >
      {unavailable && (
        <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
          <IconAlertTriangle className="size-4 shrink-0" />
          No longer available — remove to continue
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-medium">{line.product_name}</span>
          <span className="text-sm text-muted-foreground">
            {formatCents(line.unit_price_cents, line.currency)} each
          </span>
        </div>
        <span className="text-lg font-semibold tabular-nums">
          {formatCents(lineTotalCents(line), line.currency)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`Decrease quantity of ${line.product_name}`}
            onClick={() => setQuantity(line.localId, line.quantity - 1)}
          >
            <IconMinus />
          </Button>
          <span className="w-8 text-center text-base font-medium tabular-nums" aria-live="polite">
            {line.quantity}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`Increase quantity of ${line.product_name}`}
            onClick={() => setQuantity(line.localId, line.quantity + 1)}
          >
            <IconPlus />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddOnsOpen((v) => !v)}
            aria-expanded={addOnsOpen}
          >
            {line.add_ons.length > 0 ? `${line.add_ons.length} add-on${line.add_ons.length === 1 ? "" : "s"}` : "Add-ons"}
            <IconChevronDown className={addOnsOpen ? "rotate-180 transition-transform" : "transition-transform"} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${line.product_name} from cart`}
            onClick={() => removeLine(line.localId)}
          >
            <IconTrash />
          </Button>
        </div>
      </div>

      {addOnsOpen && (
        <AddOnEditor
          addOns={line.add_ons}
          currency={line.currency}
          onAdd={(addOn) => addAddOn(line.localId, addOn)}
          onRemove={(addOnLocalId) => removeAddOn(line.localId, addOnLocalId)}
        />
      )}
    </li>
  );
}
