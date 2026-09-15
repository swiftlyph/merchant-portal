import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/features/auth/store";
import { useCurrentSession } from "../use-current-session";
import { useRegisters } from "../use-registers";
import { OpenCashDrawerPanel } from "../components/open-cash-drawer-panel";
import { ReconciliationPanel } from "../components/reconciliation-panel";
import { MovementsList } from "../components/movements-list";
import { RemittancesList } from "../components/remittances-list";
import { MovementDialog } from "../components/movement-dialog";
import { RemittanceDialog } from "../components/remittance-dialog";
import { CloseCashDrawerDialog } from "../components/close-cash-drawer-dialog";
import { SessionHistoryTable } from "../components/session-history-table";
import { formatDateTime } from "../format";
import type { CashMovementType } from "../types";

/**
 * `/app/cash-drawer`. The screen a cashier opens at the start of a shift
 * and reconciles at the end (F7 goal). Register selection lives implicitly
 * in `useCurrentSession()`'s default-register behavior — this page doesn't
 * offer a register switcher beyond what OpenCashDrawerPanel shows when
 * opening, matching rule 3 (the selector only matters when there's
 * nothing open yet to pin the register).
 */
export function CashDrawerPage() {
  const { data: registersData } = useRegisters();
  const registers = registersData?.data ?? [];

  const {
    data: currentData,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useCurrentSession();

  const session = currentData?.data ?? null;

  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [movementType, setMovementType] = useState<CashMovementType>("cash_in");
  const [remittanceDialogOpen, setRemittanceDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const canOpen = useCan("drawer.open");
  const canClose = useCan("drawer.close");
  const canRecordMovements = useCan("drawer.movements");
  const canCreateRemittance = useCan("remittances.create");

  function openMovementDialog(type: CashMovementType) {
    setMovementType(type);
    setMovementDialogOpen(true);
  }

  const registerName =
    registers.length > 1 && session
      ? registers.find((r) => r.id === session.register_id)?.name
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Cash Drawer</h1>
        <p className="text-sm text-muted-foreground">
          Open at the start of a shift, record cash movements as they happen, and count the
          drawer when you close.
        </p>
      </div>

      {isPending && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {isError && !session && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Couldn't load the cash drawer."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isPending && !session && !isError && canOpen && (
        <OpenCashDrawerPanel onOpened={() => void refetch()} />
      )}

      {!isPending && !session && !isError && !canOpen && (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium">The cash drawer is closed</p>
          <p className="text-sm text-muted-foreground">
            Opening it requires staff access. Ask a teammate to open it for this shift.
          </p>
        </div>
      )}

      {session && (
        <div className="flex flex-col gap-6">
          {isError && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <span>Couldn't refresh — showing the last known figures.</span>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          )}

          <ReconciliationPanel reconciliation={session.reconciliation} isRefreshing={isFetching} />

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span>
              Opened {formatDateTime(session.opened_at)}
              {registerName ? ` · ${registerName}` : ""}
            </span>
            {session.notes && <span>Notes: {session.notes}</span>}
          </div>

          {(canRecordMovements || canCreateRemittance || canClose) && (
            <div className="flex flex-wrap gap-2">
              {canRecordMovements && (
                <>
                  <Button variant="outline" onClick={() => openMovementDialog("cash_in")}>
                    Record cash in
                  </Button>
                  <Button variant="outline" onClick={() => openMovementDialog("cash_out")}>
                    Record cash out
                  </Button>
                </>
              )}
              {canCreateRemittance && (
                <Button variant="outline" onClick={() => setRemittanceDialogOpen(true)}>
                  Record remittance
                </Button>
              )}
              {canClose && (
                <Button
                  variant="destructive"
                  className="ml-auto"
                  onClick={() => setCloseDialogOpen(true)}
                >
                  Close cash drawer
                </Button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h2 className="font-semibold">Movements</h2>
              <MovementsList movements={session.movements ?? []} />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="font-semibold">Remittances</h2>
              <RemittancesList sessionId={session.id} remittances={session.remittances ?? []} />
            </div>
          </div>

          <MovementDialog
            key={movementType}
            open={movementDialogOpen}
            onOpenChange={setMovementDialogOpen}
            sessionId={session.id}
            defaultType={movementType}
          />
          <RemittanceDialog
            open={remittanceDialogOpen}
            onOpenChange={setRemittanceDialogOpen}
            sessionId={session.id}
          />
          <CloseCashDrawerDialog
            open={closeDialogOpen}
            onOpenChange={setCloseDialogOpen}
            session={session}
            onClosed={() => void refetch()}
          />
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">History</h2>
        <SessionHistoryTable />
      </div>
    </div>
  );
}
