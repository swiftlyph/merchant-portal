import { IconInfoCircle } from "@tabler/icons-react";
import { formatCents } from "@/lib/money";
import type { CashReconciliation } from "../types";

/**
 * The prominent money panel — EXPECTED CASH is the headline figure, per
 * rule 4. Every number here comes straight from the server's reconciliation
 * object; nothing is recomputed client-side. The GCash-exclusion note is
 * deliberately explicit text, not a tooltip, since it's "the single most
 * misunderstood number on the screen" per the spec.
 */
export function ReconciliationPanel({
  reconciliation,
  isRefreshing,
}: {
  reconciliation: CashReconciliation;
  isRefreshing?: boolean;
}) {
  const r = reconciliation;

  return (
    <div
      className={
        "flex flex-col gap-4 rounded-2xl border border-border bg-card p-5" +
        (isRefreshing ? " opacity-60 transition-opacity" : "")
      }
    >
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-muted/50 py-6 text-center">
        <span className="text-sm text-muted-foreground">Expected cash</span>
        <span className="text-4xl font-bold tabular-nums">
          {formatCents(r.expected_cash_cents)}
        </span>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-sm text-info-foreground">
        <IconInfoCircle className="mt-0.5 size-4 shrink-0 text-info" />
        <span>GCash sales are never counted as cash — only cash and the cash portion of split payments contribute here.</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <ReconciliationRow label="Starting cash" value={r.opening_float_cents} />
        <ReconciliationRow
          label="Cash sales"
          value={r.cash_sales_cents}
          helperText="Includes voided sales, which are subtracted below. Reports show cash revenue with voids already removed."
        />
        <ReconciliationRow label="Voided cash" value={-r.voided_cash_cents} />
        <ReconciliationRow label="Cash in" value={r.cash_in_cents} />
        <ReconciliationRow label="Cash out" value={-r.cash_out_cents} />
        <ReconciliationRow label="Cash sent out (confirmed)" value={-r.confirmed_remittances_cents} />
      </dl>
    </div>
  );
}

function ReconciliationRow({
  label,
  value,
  helperText,
}: {
  label: string;
  value: number;
  /** Short explanatory copy shown under the row — same explicit-text pattern as the GCash note above. */
  helperText?: string;
}) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{formatCents(value)}</dd>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
