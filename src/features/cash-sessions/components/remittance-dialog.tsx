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
import { useCreateRemittance } from "../use-create-remittance";
import { describeRemittanceError } from "../errors";

function pesosToCents(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/**
 * Remittance dialog (rule 6): amount + optional note. Deliberately no
 * attachment upload field — the backend has no upload endpoint for
 * remittances this phase (attachment_path is always null server-side).
 */
export function RemittanceDialog({
  open,
  onOpenChange,
  sessionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: number;
}) {
  const { mutateAsync, isPending, reset } = useCreateRemittance(sessionId);
  const [amountInput, setAmountInput] = useState("");
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const amountCents = pesosToCents(amountInput);
  const canSubmit = amountCents > 0;

  function resetForm() {
    setAmountInput("");
    setNote("");
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
      await mutateAsync({ amount_cents: amountCents, note: note.trim() ? note.trim() : undefined });
      close();
    } catch (error) {
      setErrorMessage(describeRemittanceError(error));
    } finally {
      inFlightRef.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!isPending ? (next ? onOpenChange(true) : close()) : undefined)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record remittance</DialogTitle>
          <DialogDescription>
            Cash removed from the drawer for deposit or hand-off. Created as pending until a
            different user confirms it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="remittance-amount" className="text-xs text-muted-foreground">
              Amount
            </label>
            <Input
              id="remittance-amount"
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
            <label htmlFor="remittance-note" className="text-xs text-muted-foreground">
              Note (optional)
            </label>
            <Input
              id="remittance-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. bank deposit slip #1234"
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
            {isPending ? "Recording…" : "Record remittance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
