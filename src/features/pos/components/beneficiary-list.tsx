import { IconAlertTriangle, IconTrash, IconUserPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import { estimatedLineDiscountCents, lineTotalCents } from "../cart-math";
import { useCartStore } from "../use-cart";
import type { CartBeneficiary } from "../cart-types";

const TYPE_LABEL: Record<CartBeneficiary["type"], string> = {
  senior: "Senior",
  pwd: "PWD",
};

/**
 * F13/P10: the cart-level list of senior/PWD claims added so far — usually
 * empty. Shows, per beneficiary: their name/ID, how many lines are
 * currently assigned to them, and a rough "estimated" savings figure
 * (see cart-math.ts's ESTIMATED_STATUTORY_DISCOUNT_RATE for why this is
 * deliberately NOT the exact server formula) — clearly labelled so it's
 * never mistaken for what will actually be charged.
 *
 * A beneficiary with ZERO assigned lines is flagged inline (mirroring the
 * backend's own `beneficiary_unused` 422) rather than only caught at
 * checkout — the cashier sees the problem before tapping Charge, though
 * CartPanel/PaymentDialog still handle the 422 defensively regardless
 * (a beneficiary could in principle become unassigned between this
 * render and the request going out, e.g. their last line being removed
 * from a different tap in a fast sequence).
 */
export function BeneficiaryList({ onAddClick }: { onAddClick: () => void }) {
  const { lines, beneficiaries, removeBeneficiary } = useCartStore();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Senior/PWD discount</span>
        <Button type="button" variant="ghost" size="sm" onClick={onAddClick}>
          <IconUserPlus />
          Add
        </Button>
      </div>

      {beneficiaries.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {beneficiaries.map((beneficiary) => {
            const assignedLines = lines.filter((l) => l.beneficiaryLocalId === beneficiary.localId);
            const currency = assignedLines[0]?.currency ?? lines[0]?.currency ?? "PHP";
            const estimatedCents = assignedLines.reduce(
              (sum, line) => sum + estimatedLineDiscountCents(line),
              0,
            );
            const unused = assignedLines.length === 0;

            return (
              <li
                key={beneficiary.localId}
                className={
                  "flex flex-col gap-1 rounded-lg border p-2 text-sm" +
                  (unused ? " border-destructive/60 bg-destructive/5" : " border-border bg-muted/40")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {beneficiary.name}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({TYPE_LABEL[beneficiary.type]})
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">ID {beneficiary.id_number}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${beneficiary.name}`}
                    onClick={() => removeBeneficiary(beneficiary.localId)}
                  >
                    <IconTrash />
                  </Button>
                </div>

                {unused ? (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <IconAlertTriangle className="size-3.5 shrink-0" />
                    No items assigned yet — tap an item below to assign it.
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {assignedLines.length} item{assignedLines.length === 1 ? "" : "s"} (
                      {formatCents(
                        assignedLines.reduce((sum, l) => sum + lineTotalCents(l), 0),
                        currency,
                      )}
                      )
                    </span>
                    <span>Est. savings {formatCents(estimatedCents, currency)}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
