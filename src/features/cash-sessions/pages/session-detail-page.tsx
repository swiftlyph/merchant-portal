import { Link, useParams } from "react-router-dom";
import { IconPrinter } from "@tabler/icons-react";
import { useSession } from "../use-session";
import { ReconciliationPanel } from "../components/reconciliation-panel";
import { MovementsList } from "../components/movements-list";
import { RemittancesList } from "../components/remittances-list";
import { SessionStatusBadge } from "../components/session-status-badge";
import { VarianceBadge } from "../components/variance-badge";
import { formatDateTime } from "../format";
import { formatCents } from "@/lib/money";
import { ApiError } from "@/lib/api/client";
import { useCan } from "@/features/auth/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** `/app/cash-drawer/sessions/:id` — read-only detail for a past (or current) session. */
export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = id ?? "";
  const { data: session, isPending, isError, error } = useSession(sessionId);
  const canPrintReport = useCan("drawer.view");

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm font-medium">
          {notFound ? "Session not found" : "Couldn't load this session"}
        </p>
        <p className="text-sm text-muted-foreground">
          {notFound
            ? "This cash session doesn't exist or doesn't belong to your account."
            : error instanceof Error
              ? error.message
              : "Something went wrong."}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/cash-drawer">Back to cash drawer</Link>
        </Button>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Session #{session.id}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SessionStatusBadge status={session.status} />
            <span>Opened {formatDateTime(session.opened_at)}</span>
            {session.closed_at && <span>· Closed {formatDateTime(session.closed_at)}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {canPrintReport && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/app/cash-drawer/sessions/${session.id}/report`}>
                <IconPrinter />
                Print shift report
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to="/app/cash-drawer">Back to cash drawer</Link>
          </Button>
        </div>
      </div>

      <ReconciliationPanel reconciliation={session.reconciliation} />

      {session.status === "closed" && (
        <div className="flex flex-wrap gap-6 rounded-2xl border border-border p-5 text-sm">
          <SummaryStat label="Counted cash" value={formatCents(session.reconciliation.counted_cash_cents ?? 0)} />
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Difference</span>
            <span className="font-medium tabular-nums">
              <VarianceBadge varianceCents={session.reconciliation.variance_cents} />
            </span>
          </div>
        </div>
      )}

      {session.notes && (
        <p className="text-sm text-muted-foreground">Notes: {session.notes}</p>
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
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
