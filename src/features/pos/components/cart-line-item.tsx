import { useState } from "react";
import { IconAlertTriangle, IconChevronDown, IconMinus, IconPlus, IconTrash, IconUserCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCents } from "@/lib/money";
import { AddOnEditor } from "./add-on-editor";
import { estimatedLineDiscountCents, lineTotalCents } from "../cart-math";
import { useCartStore } from "../use-cart";
import type { CartLine } from "../cart-types";

/** The value the "no beneficiary" option carries in the Select below — "" rather than a real localId, since Radix's Select can't represent an empty-string item value as a distinct selectable option otherwise. */
const NONE_VALUE = "__none__";

export function CartLineItem({
  line,
  unavailable = false,
}: {
  line: CartLine;
  /** True when the last checkout attempt rejected this product as no-longer-available. */
  unavailable?: boolean;
}) {
  const { setQuantity, removeLine, addAddOn, removeAddOn, beneficiaries, setLineBeneficiary } =
    useCartStore();
  const [addOnsOpen, setAddOnsOpen] = useState(false);

  const assignedBeneficiary = beneficiaries.find((b) => b.localId === line.beneficiaryLocalId);
  const estimatedDiscountCents = estimatedLineDiscountCents(line);

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

      {/*
        F13/P10: assigns this WHOLE line to one senior/PWD claim, or back
        to nobody ("None") — never a per-unit split (see
        CartLine.beneficiaryLocalId's docblock). Rendered only once at
        least one beneficiary exists on the order — with none added yet,
        there is nothing to assign to, so the control would just be a
        disabled no-op taking up space on every line.
      */}
      {beneficiaries.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-dashed border-border pt-2">
          <Select
            value={line.beneficiaryLocalId ?? NONE_VALUE}
            onValueChange={(v) => setLineBeneficiary(line.localId, v === NONE_VALUE ? null : v)}
          >
            <SelectTrigger
              size="sm"
              aria-label={`Assign ${line.product_name} to a senior/PWD discount`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>No discount</SelectItem>
              {beneficiaries.map((beneficiary) => (
                <SelectItem key={beneficiary.localId} value={beneficiary.localId}>
                  {beneficiary.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {assignedBeneficiary && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconUserCheck className="size-3.5 shrink-0" />
              Est. −{formatCents(estimatedDiscountCents, line.currency)}
            </span>
          )}
        </div>
      )}
    </li>
  );
}
