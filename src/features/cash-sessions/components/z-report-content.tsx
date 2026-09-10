import { IconAlertTriangle } from "@tabler/icons-react";
import { formatDateTime, MOVEMENT_TYPE_LABEL, REMITTANCE_STATUS_LABEL } from "../format";
import { VarianceBadge } from "./variance-badge";
import type { ZReport } from "../types";

/**
 * The shift report body shared by /app/cash-drawer/sessions/:id/report and
 * (via PrintFrame's on-screen preview) the close-drawer success summary.
 * The `cash` block below renders in the EXACT SAME label order as
 * ReconciliationPanel (rule 3): Opening float, Cash sales (gross), Voided
 * cash, Cash in, Cash out, Confirmed remittances, then the Expected cash
 * headline — so a cashier reading both the on-screen panel and a printed
 * report sees the same story, never a reordered or relabeled one.
 */
export function ZReportContent({ report }: { report: ZReport }) {
  const { session, float, sales, top_items, cash, movements, remittances } = report;
  const isOpen = session.status === "open";

  return (
    <div className="flex flex-col gap-3">
      {isOpen && (
        <div className="flex items-center justify-center gap-1 border-2 border-warning bg-warning/10 px-3 py-2 text-center text-sm font-bold tracking-wide text-warning-foreground">
          <IconAlertTriangle className="size-4" />
          PRELIMINARY — SESSION STILL OPEN
        </div>
      )}

      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-sm font-bold">Shift Report</span>
        <span>{session.register_name}</span>
        <span>Session #{session.id}</span>
      </div>

      <div className="flex flex-col gap-0.5 border-t border-dashed border-black/40 pt-2">
        <Row label="Opened" value={formatDateTime(session.opened_at)} />
        {session.closed_at && <Row label="Closed" value={formatDateTime(session.closed_at)} />}
        <Row label="Status" value={isOpen ? "Open" : "Closed"} />
      </div>

      <div className="flex flex-col gap-0.5 border-t border-dashed border-black/40 pt-2">
        <div className="text-center font-bold">Sales summary</div>
        <Row label="Opening float" value={float.opening_float_formatted} />
        <Row label="Orders" value={String(sales.orders_count)} />
        <Row label="Voided" value={String(sales.voided_count)} />
        <Row label="Gross" value={sales.gross_formatted} />
        <Row label="Discounts" value={`-${sales.discounts_formatted}`} />
        <Row label="Net" value={sales.net_formatted} emphasize />
      </div>

      <div className="flex flex-col gap-0.5 border-t border-dashed border-black/40 pt-2">
        <div className="text-center font-bold">Payment breakdown</div>
        <Row
          label={`Cash (${sales.by_payment_method.cash.count})`}
          value={sales.by_payment_method.cash.amount_formatted}
        />
        <Row
          label={`GCash (${sales.by_payment_method.gcash.count})`}
          value={sales.by_payment_method.gcash.amount_formatted}
        />
        <Row
          label={`Split (${sales.by_payment_method.split.count})`}
          value={sales.by_payment_method.split.amount_formatted}
        />
      </div>

      {top_items.length > 0 && (
        <div className="flex flex-col gap-0.5 border-t border-dashed border-black/40 pt-2">
          <div className="text-center font-bold">Top items</div>
          {top_items.map((item, index) => (
            <div key={`${item.product_name}-${index}`} className="flex justify-between">
              <span>
                {item.quantity_sold}x {item.product_name}
              </span>
              <span>{item.net_formatted}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-0.5 border-t border-dashed border-black/40 pt-2">
        <div className="text-center font-bold">Cash reconciliation</div>
        <Row label="Opening float" value={float.opening_float_formatted} />
        <Row label="Cash sales (gross)" value={cash.cash_sales_gross_formatted} />
        <Row label="Voided cash" value={`-${cash.voided_cash_formatted}`} />
        <Row label="Cash in" value={cash.cash_in_formatted} />
        <Row label="Cash out" value={`-${cash.cash_out_formatted}`} />
        <Row label="Confirmed remittances" value={`-${cash.confirmed_remittances_formatted}`} />
        <Row label="Expected cash" value={cash.expected_cash_formatted} emphasize />
        {cash.counted_cash_formatted !== null ? (
          <>
            <Row label="Counted cash" value={cash.counted_cash_formatted} emphasize />
            <div className="flex justify-between font-bold">
              <span>Variance</span>
              <VarianceBadge varianceCents={cash.variance_cents} />
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground">Session still open — not yet counted.</p>
        )}
      </div>

      {movements.length > 0 && (
        <div className="flex flex-col gap-0.5 border-t border-dashed border-black/40 pt-2">
          <div className="text-center font-bold">Movements</div>
          {movements.map((movement) => (
            <div key={movement.id} className="flex justify-between">
              <span>
                {MOVEMENT_TYPE_LABEL[movement.type]}: {movement.reason}
              </span>
              <span>
                {movement.type === "cash_in" ? "+" : "-"}
                {movement.amount_formatted}
              </span>
            </div>
          ))}
        </div>
      )}

      {remittances.length > 0 && (
        <div className="flex flex-col gap-0.5 border-t border-dashed border-black/40 pt-2">
          <div className="text-center font-bold">Remittances</div>
          {remittances.map((remittance) => (
            <div key={remittance.id} className="flex justify-between">
              <span>{REMITTANCE_STATUS_LABEL[remittance.status]}</span>
              <span>{remittance.amount_formatted}</span>
            </div>
          ))}
        </div>
      )}

      <p className="border-t border-dashed border-black/40 pt-2 text-center text-muted-foreground">
        This report covers only orders rung up during this drawer session. The Reports page
        covers calendar dates instead — the two can differ by design.
      </p>

      <p className="text-center text-muted-foreground">Generated {formatDateTime(report.generated_at)}</p>

      {isOpen && (
        <div className="flex items-center justify-center gap-1 border-2 border-warning bg-warning/10 px-3 py-2 text-center text-sm font-bold tracking-wide text-warning-foreground">
          <IconAlertTriangle className="size-4" />
          PRELIMINARY — SESSION STILL OPEN
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className={"flex justify-between" + (emphasize ? " font-bold" : "")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
