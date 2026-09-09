import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirmRemittance } from "../use-confirm-remittance";
import { REMITTANCE_STATUS_LABEL, formatDateTime } from "../format";
import { describeConfirmError } from "../errors";
import type { CashRemittance } from "../types";

/**
 * Rule 4's remittances list: status, amount, creator, and a Confirm action
 * on pending rows. The 403 confirmation_requires_second_user path (rule 7)
 * renders inline, right on the row that triggered it, rather than as a
 * generic toast — it's a deliberate control, so the explanation should
 * read as intentional, not like an error the cashier caused.
 */
export function RemittancesList({
  sessionId,
  remittances,
}: {
  sessionId: number;
  remittances: CashRemittance[];
}) {
  const { mutateAsync, isPending, variables } = useConfirmRemittance(sessionId);
  const [inlineError, setInlineError] = useState<{ id: number; message: string } | null>(null);

  if (remittances.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        No remittances yet.
      </p>
    );
  }

  const sorted = [...remittances].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  async function handleConfirm(remittance: CashRemittance) {
    setInlineError(null);
    try {
      await mutateAsync(remittance.id);
      toast.success(`Remittance of ${remittance.amount_formatted} confirmed.`);
    } catch (error) {
      setInlineError({ id: remittance.id, message: describeConfirmError(error) });
    }
  }

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((remittance) => (
        <li
          key={remittance.id}
          className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 text-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="font-medium tabular-nums">{remittance.amount_formatted}</span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(remittance.created_at)}
                {remittance.note ? ` · ${remittance.note}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={remittance.status === "confirmed" ? "default" : "secondary"}>
                {REMITTANCE_STATUS_LABEL[remittance.status]}
              </Badge>
              {remittance.status === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending && variables === remittance.id}
                  onClick={() => void handleConfirm(remittance)}
                >
                  {isPending && variables === remittance.id ? "Confirming…" : "Confirm"}
                </Button>
              )}
            </div>
          </div>
          {inlineError?.id === remittance.id && (
            <p className="text-sm text-destructive">{inlineError.message}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
