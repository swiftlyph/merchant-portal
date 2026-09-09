import { useRef, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRecordMovement } from "../use-record-movement";
import { describeMovementError } from "../errors";
import type { CashMovementType } from "../types";

function pesosToCents(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/** Movement dialog (rule 5): type, amount (currency -> cents), required non-empty reason. */
export function MovementDialog({
  open,
  onOpenChange,
  sessionId,
  defaultType = "cash_in",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: number;
  defaultType?: CashMovementType;
}) {
  const { mutateAsync, isPending, reset } = useRecordMovement(sessionId);
  const [type, setType] = useState<CashMovementType>(defaultType);
  const [amountInput, setAmountInput] = useState("");
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const amountCents = pesosToCents(amountInput);
  const reasonValid = reason.trim().length > 0;
  const canSubmit = amountCents > 0 && reasonValid;

  function resetForm() {
    setType(defaultType);
    setAmountInput("");
    setReason("");
    setErrorMessage(null);
    reset();
  }

  function close() {
    onOpenChange(false);
    resetForm();
  }

  async function submit() {
    if (inFlightRef.current || !canSubmit) return;
    inFlightRef.current = true;
    setErrorMessage(null);
    try {
      await mutateAsync({ type, amount_cents: amountCents, reason: reason.trim() });
      close();
    } catch (error) {
      setErrorMessage(describeMovementError(error));
    } finally {
      inFlightRef.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!isPending ? (next ? onOpenChange(true) : close()) : undefined)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record cash movement</DialogTitle>
          <DialogDescription>
            Cash added to or removed from the drawer outside a sale.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => setType(v as CashMovementType)}>
          <TabsList className="w-full">
            <TabsTrigger value="cash_in" className="flex-1">
              Cash in
            </TabsTrigger>
            <TabsTrigger value="cash_out" className="flex-1">
              Cash out
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="movement-amount" className="text-xs text-muted-foreground">
              Amount
            </label>
            <Input
              id="movement-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="movement-reason" className="text-xs text-muted-foreground">
              Reason
            </label>
            <Input
              id="movement-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={type === "cash_in" ? "e.g. change fund top-up" : "e.g. bank drop"}
            />
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        <DialogFooter>
          <Button disabled={isPending || !canSubmit} onClick={() => void submit()}>
            {isPending ? "Recording…" : type === "cash_in" ? "Record cash in" : "Record cash out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
