import { useState } from "react";
import { IconLockOpen } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOpenSession } from "../use-open-session";
import { useRegisters } from "../use-registers";
import { isSessionAlreadyOpen, describeOpenSessionError } from "../errors";
import type { Register } from "../types";

function pesosToCents(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/**
 * NO OPEN SESSION state (rule 3). The register selector only renders when
 * the merchant has more than one register — most shops have exactly one,
 * and forcing a choice there would be pure friction. A 409
 * session_already_open is treated as "another device just opened it", not
 * a raw error: onSessionOpened is called (via onOpened) after refetching
 * rather than showing an error banner.
 */
export function OpenCashDrawerPanel({ onOpened }: { onOpened: () => void }) {
  const { data: registersData, isPending: registersPending } = useRegisters();
  const registers = registersData?.data ?? [];
  const multipleRegisters = registers.length > 1;
  const defaultRegister = registers.find((r) => r.is_default) ?? registers[0];

  const [registerId, setRegisterId] = useState<number | undefined>(undefined);
  const [floatInput, setFloatInput] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutateAsync, isPending } = useOpenSession();

  const selectedRegisterId = registerId ?? defaultRegister?.id;
  const openingFloatCents = pesosToCents(floatInput);

  async function handleOpen() {
    setErrorMessage(null);
    try {
      await mutateAsync({
        register_id: multipleRegisters ? selectedRegisterId : undefined,
        opening_float_cents: openingFloatCents,
        notes: notes.trim() ? notes.trim() : undefined,
      });
      onOpened();
    } catch (error) {
      if (isSessionAlreadyOpen(error)) {
        // Another device opened it a moment ago — the fresh state is what
        // matters, not the error text.
        onOpened();
        return;
      }
      setErrorMessage(describeOpenSessionError(error));
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-border p-10 text-center">
      <IconLockOpen className="size-10 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">The cash drawer is closed</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Open the cash drawer to start a shift. Count the starting cash and enter it below —
          this becomes the starting cash for this shift.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3 text-left">
        {multipleRegisters && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cash-drawer-register" className="text-xs text-muted-foreground">
              Register
            </label>
            <Select
              value={selectedRegisterId ? String(selectedRegisterId) : undefined}
              onValueChange={(v) => setRegisterId(Number(v))}
            >
              <SelectTrigger id="cash-drawer-register" className="w-full">
                <SelectValue placeholder={registersPending ? "Loading…" : "Select a register"} />
              </SelectTrigger>
              <SelectContent>
                {registers.map((r: Register) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                    {r.is_default ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cash-drawer-opening-float" className="text-xs text-muted-foreground">
            Starting cash
          </label>
          <Input
            id="cash-drawer-opening-float"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={floatInput}
            onChange={(e) => setFloatInput(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cash-drawer-open-notes" className="text-xs text-muted-foreground">
            Notes (optional)
          </label>
          <Input
            id="cash-drawer-open-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. counted with manager"
          />
        </div>

        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

        <Button
          size="lg"
          disabled={isPending || (multipleRegisters && !selectedRegisterId)}
          onClick={() => void handleOpen()}
        >
          {isPending ? "Opening…" : "Open cash drawer"}
        </Button>
      </div>
    </div>
  );
}
