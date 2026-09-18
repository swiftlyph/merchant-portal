import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuditLog } from "../use-audit-log";
import { ActionBadge } from "../components/action-badge";
import { EntryDetailsSheet } from "../components/entry-details-sheet";
import { formatDateTime } from "../format";
import type { AuditLogEntry } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
 * `/app/audit-log` — Owner/Manager only (see RequirePermission on the
 * route). Filters (action/from/to/page) live in the URL, matching Orders'
 * convention, so a refresh or a shared link restores the exact filtered
 * view. There is no actor picker: GET /merchant/audit-log accepts
 * actor_user_id, but this app has no existing "pick a team member" control
 * to reuse yet, and the action/date filters cover the common "what happened
 * recently" and "what happened to X" questions without it.
 */
export function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const actionParam = searchParams.get("action") ?? "";
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const filters = {
    action: actionParam || undefined,
    from: fromParam || undefined,
    to: toParam || undefined,
    page,
  };

  const { data, isPending, isError, error, refetch, isFetching } = useAuditLog(filters);
  const visibleEntries = data?.data ?? [];
  const hasFilters = Boolean(actionParam || fromParam || toParam);

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    setSearchParams(params);
  }

  function goToPage(nextPage: number) {
    updateParams({ page: nextPage > 1 ? String(nextPage) : null });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <p className="text-sm text-muted-foreground">
          Every action taken on this merchant's account, and who did it.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-action-filter" className="text-xs text-muted-foreground">
            Action
          </label>
          <Input
            id="audit-action-filter"
            placeholder="e.g. order.voided"
            className="w-48"
            value={actionParam}
            onChange={(e) => updateParams({ action: e.target.value || null, page: null })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-from-filter" className="text-xs text-muted-foreground">
            From
          </label>
          <Input
            id="audit-from-filter"
            type="date"
            className="w-40"
            value={fromParam}
            onChange={(e) => updateParams({ from: e.target.value || null, page: null })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-to-filter" className="text-xs text-muted-foreground">
            To
          </label>
          <Input
            id="audit-to-filter"
            type="date"
            className="w-40"
            value={toParam}
            onChange={(e) => updateParams({ to: e.target.value || null, page: null })}
          />
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateParams({ action: null, from: null, to: null, page: null })}
          >
            Clear filters
          </Button>
        )}
      </div>

      {isPending && <AuditLogTableSkeleton />}

      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Couldn't load the audit trail."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isPending && !isError && data && visibleEntries.length === 0 && (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium">No activity found</p>
          <p className="text-sm text-muted-foreground">Try a different action or date range.</p>
        </div>
      )}

      {!isPending && !isError && data && visibleEntries.length > 0 && (
        <>
          <Table className={isFetching ? "opacity-60 transition-opacity" : undefined}>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Subject</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEntries.map((entry) => (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                  <TableCell>
                    <ActionBadge action={entry.action} />
                  </TableCell>
                  <TableCell>{entry.actor.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {entry.subject_type.split("\\").pop()} #{entry.subject_id}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data.meta.last_page > 1 && (
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
        </>
      )}

      <EntryDetailsSheet
        entry={selectedEntry}
        open={selectedEntry !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEntry(null);
        }}
      />
    </div>
  );
}

function AuditLogTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
