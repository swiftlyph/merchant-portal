import { useNavigate, useSearchParams } from "react-router-dom";
import { useSessionHistory } from "../use-session-history";
import { SessionStatusBadge } from "./session-status-badge";
import { VarianceBadge } from "./variance-badge";
import { formatCents } from "@/lib/money";
import { formatDateTime } from "../format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

/**
 * Rule 9's paginated history list. Page lives in the URL (?page=), same
 * pattern as src/features/orders/pages/orders-page.tsx — this table is
 * embedded in the cash-drawer page rather than owning a whole route, but
 * the URL state convention still applies so a refresh keeps the page you
 * were on.
 */
export function SessionHistoryTable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const pageParam = Number(searchParams.get("history_page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const { data, isPending, isError, error, refetch, isFetching } = useSessionHistory({ page });
  const sessions = data?.data ?? [];

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams);
    if (nextPage > 1) {
      params.set("history_page", String(nextPage));
    } else {
      params.delete("history_page");
    }
    setSearchParams(params);
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Couldn't load session history."}
        </p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm font-medium">No past sessions</p>
        <p className="text-sm text-muted-foreground">Closed cash drawers will show up here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Table className={isFetching ? "opacity-60 transition-opacity" : undefined}>
        <TableHeader>
          <TableRow>
            <TableHead>Opened</TableHead>
            <TableHead>Closed</TableHead>
            <TableHead>Starting cash</TableHead>
            <TableHead>Expected</TableHead>
            <TableHead>Counted</TableHead>
            <TableHead>Difference</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow
              key={session.id}
              className="cursor-pointer"
              onClick={() => navigate(`/app/cash-drawer/sessions/${session.id}`)}
            >
              <TableCell>{formatDateTime(session.opened_at)}</TableCell>
              <TableCell>
                {session.closed_at ? formatDateTime(session.closed_at) : "—"}
              </TableCell>
              <TableCell>{session.opening_float_formatted}</TableCell>
              <TableCell>{formatCents(session.reconciliation.expected_cash_cents)}</TableCell>
              <TableCell>
                {session.reconciliation.counted_cash_cents !== null
                  ? formatCents(session.reconciliation.counted_cash_cents)
                  : "—"}
              </TableCell>
              <TableCell>
                <VarianceBadge varianceCents={session.reconciliation.variance_cents} />
              </TableCell>
              <TableCell>
                <SessionStatusBadge status={session.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data && data.meta.last_page > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page <= 1}
                className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) goToPage(page - 1);
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-2 text-sm text-muted-foreground">
                Page {data.meta.current_page} of {data.meta.last_page}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page >= data.meta.last_page}
                className={
                  page >= data.meta.last_page ? "pointer-events-none opacity-50" : undefined
                }
                onClick={(e) => {
                  e.preventDefault();
                  if (page < data.meta.last_page) goToPage(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
