import { useId, useState } from "react";
import { IconPlus, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADD_ON_PRESETS } from "../add-on-presets";
import { formatCents } from "@/lib/money";
import type { CartAddOn } from "../cart-types";

/**
 * Per-line add-on editor: a preset row for one-tap common extras, plus a
 * free-text name + peso price for anything else. Validates name non-empty
 * and price >= 0 before enabling "Add" — no add-on catalog exists yet, so
 * this is deliberately the whole UI for it, not a picker over real data.
 */
export function AddOnEditor({
  addOns,
  currency,
  onAdd,
  onRemove,
}: {
  addOns: CartAddOn[];
  currency: string;
  onAdd: (addOn: { name: string; price_cents: number }) => void;
  onRemove: (localId: string) => void;
}) {
  const nameId = useId();
  const priceId = useId();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const priceCents = Math.round(Number(price) * 100);
  const canAdd = name.trim().length > 0 && Number.isFinite(priceCents) && priceCents >= 0 && price !== "";

  function submit() {
    if (!canAdd) return;
    onAdd({ name: name.trim(), price_cents: priceCents });
    setName("");
    setPrice("");
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-2">
      {addOns.length > 0 && (
        <ul className="flex flex-col gap-1">
          {addOns.map((addOn) => (
            <li key={addOn.localId} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                + {addOn.name} ({formatCents(addOn.price_cents, currency)})
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${addOn.name}`}
                onClick={() => onRemove(addOn.localId)}
              >
                <IconX />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-1">
        {ADD_ON_PRESETS.map((preset) => (
          <Button
            key={preset.name}
            type="button"
            variant="outline"
            size="xs"
            onClick={() => onAdd(preset)}
          >
            {preset.name}
          </Button>
        ))}
      </div>

      <div className="flex items-end gap-1.5">
        <div className="flex-1">
          <label htmlFor={nameId} className="sr-only">
            Add-on name
          </label>
          <Input
            id={nameId}
            placeholder="Custom add-on"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="w-20">
          <label htmlFor={priceId} className="sr-only">
            Add-on price
          </label>
          <Input
            id={priceId}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <Button type="button" size="icon-sm" disabled={!canAdd} onClick={submit} aria-label="Add add-on">
          <IconPlus />
        </Button>
      </div>
    </div>
  );
}
