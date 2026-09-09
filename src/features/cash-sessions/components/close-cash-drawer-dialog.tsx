import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconAlertTriangle } from "@tabler/icons-react";
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
import { formatCents } from "@/lib/money";
import { useCloseSession } from "../use-close-session";
import { describeCloseError, describeVariance, isSessionClosed } from "../errors";
import type { CashSession } from "../types";

function pesosToCents(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/**
 * CLOSE CASH DRAWER (rule 8) — the highest-stakes interaction on this
 * screen. Variance is computed live, client-side, purely as
 * `counted - expected` in integer cents (the one arithmetic exception the
 * rules allow) — never sent to the server and never substituted for the
 * server's own frozen figures once the close succeeds. A non-zero variance
 * does not block closing (a real count is a real count) but does require
 * an explicit second confirm step, so a cashier can't fat-finger past a
 * real discrepancy without seeing it twice.
 */
export function CloseCashDrawerDialog({
  open,
  onOpenChange,
  session,
  onClosed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CashSession;
  onClosed: () => void;
}) {
  const navigate = useNavigate();
  const { mutateAsync, isPending, reset } = useCloseSession(session.id);

  const [countedInput, setCountedInput] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmingVariance, setConfirmingVariance] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CashSession | null>(null);
  const inFlightRef = useRef(false);

  const expectedCents = session.reconciliation.expected_cash_cents;
  const hasCountedInput = countedInput.trim().length > 0;
  const countedCents = pesosToCents(countedInput);
  const varianceCents = countedCents - expectedCents;
  const variance = describeVariance(varianceCents);

  function resetForm() {
    setCountedInput("");
    setNotes("");
    setConfirmingVariance(false);
    setErrorMessage(null);
    setResult(null);
    reset();
  }

  function close() {
    onOpenChange(false);
    resetForm();
    if (result) onClosed();
  }

  async function doClose() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setErrorMessage(null);
    try {
      const closed = await mutateAsync({
        counted_cash_cents: countedCents,
        notes: notes.trim() ? notes.trim() : undefined,
      });
      setResult(closed);
    } catch (error) {
      if (isSessionClosed(error)) {
        setErrorMessage(describeCloseError(error));
        onClosed(); // refetch current so the screen catches up
      } else {
        setErrorMessage(describeCloseError(error));
      }
    } finally {
      inFlightRef.current = false;
    }
  }

  function handlePrimaryAction() {
    if (!hasCountedInput) return;
    if (varianceCents !== 0 && !confirmingVariance) {
      setConfirmingVariance(true);
      return;
    }
    void doClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (!isPending ? (next ? onOpenChange(true) : close()) : undefined)}
    >
      <DialogContent className="sm:max-w-sm">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Cash drawer closed</DialogTitle>
              <DialogDescription>Here's the final reconciliation for this shift.</DialogDescription>
            </DialogHeader>

            <dl className="flex flex-col gap-2 text-sm">
              <SummaryRow label="Expected" value={result.reconciliation.expected_cash_cents} />
              <SummaryRow label="Counted" value={result.reconciliation.counted_cash_cents ?? 0} />
              <SummaryRow
                label="Variance"
                value={result.reconciliation.variance_cents ?? 0}
                emphasize
              />
            </dl>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="outline" onClick={close}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const id = result.id;
                  close();
                  navigate(`/app/cash-drawer/sessions/${id}`);
                }}
              >
                View session
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Close cash drawer</DialogTitle>
              <DialogDescription>
                Count the drawer and enter the total. This can't be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Expected cash</span>
                <span className="font-medium tabular-nums">{formatCents(expectedCents)}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="close-counted-cash" className="text-xs text-muted-foreground">
                  Counted cash
                </label>
                <Input
                  id="close-counted-cash"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={countedInput}
                  onChange={(e) => {
                    setCountedInput(e.target.value);
                    setConfirmingVariance(false);
                  }}
                />
              </div>

              {hasCountedInput && (
                <div
                  aria-live="polite"
                  className={
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium " +
                    (variance.label === "exact"
                      ? "bg-success/10 text-success"
                      : variance.label === "over"
                        ? "bg-info/10 text-info-foreground"
                        : "bg-destructive/10 text-destructive")
                  }
                >
                  <span>Variance</span>
                  <span className="tabular-nums">{variance.text}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="close-notes" className="text-xs text-muted-foreground">
                  Notes (optional)
                </label>
                <Input
                  id="close-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. recounted twice"
                />
              </div>

              {confirmingVariance && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    The count is {variance.text.toLowerCase()}. Closing will record this variance
                    permanently — confirm to proceed.
                  </span>
                </div>
              )}

              {errorMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {errorMessage}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant={confirmingVariance ? "destructive" : "default"}
                disabled={isPending || !hasCountedInput}
                onClick={handlePrimaryAction}
              >
                {isPending
                  ? "Closing…"
                  : confirmingVariance
                    ? "Confirm and close cash drawer"
                    : "Close cash drawer"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={"tabular-nums " + (emphasize ? "font-semibold" : "")}>
        {formatCents(value)}
      </dd>
    </div>
  );
}
