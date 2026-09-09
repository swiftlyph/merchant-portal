import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";
import { MOVEMENT_TYPE_LABEL, formatDateTime } from "../format";
import type { CashMovement } from "../types";

/**
 * Newest first (rule 4's movements list requirement) — callers pass the
 * array already however the server returned it; sorting happens here so
 * every consumer of this component agrees on order regardless of what the
 * backend's default happens to be today.
 */
export function MovementsList({ movements }: { movements: CashMovement[] }) {
  if (movements.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        No movements yet.
      </p>
    );
  }

  const sorted = [...movements].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((movement) => (
        <li
          key={movement.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
        >
          <div className="flex items-center gap-2">
            {movement.type === "cash_in" ? (
              <IconArrowDown className="size-4 shrink-0 text-success" />
            ) : (
              <IconArrowUp className="size-4 shrink-0 text-destructive" />
            )}
            <div className="flex flex-col">
              <span className="font-medium">{movement.reason}</span>
              <span className="text-xs text-muted-foreground">
                {MOVEMENT_TYPE_LABEL[movement.type]} · {formatDateTime(movement.created_at)}
              </span>
            </div>
          </div>
          <span
            className={
              "tabular-nums font-medium " +
              (movement.type === "cash_in" ? "text-success" : "text-destructive")
            }
          >
            {movement.type === "cash_in" ? "+" : "-"}
            {movement.amount_formatted}
          </span>
        </li>
      ))}
    </ul>
  );
}
