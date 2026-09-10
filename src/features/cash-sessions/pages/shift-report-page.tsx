import { Link, useParams } from "react-router-dom";
import { useZReport } from "../use-z-report";
import { ZReportContent } from "../components/z-report-content";
import { PrintFrame } from "@/components/print-frame";
import { PrintButton } from "@/components/print-button";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/app/cash-drawer/sessions/:id/report` — bare, chrome-free print view
 * (same rationale as ReceiptPage: no sidebar/header even renders here).
 * Works for both an open session (PRELIMINARY mark, live-computed expected
 * cash matching the drawer panel) and a closed one (final figures, no
 * preliminary mark) — ZReportContent branches on report.session.status.
 */
export function ShiftReportPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = id ?? "";
  const { data: report, isPending, isError, error } = useZReport(sessionId);

  if (isPending) {
    return (
      <div className="mx-auto flex max-w-[80mm] flex-col gap-3 p-4">
        <Skeleton className="h-8 w-full" />
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
          {notFound ? "Session not found" : "Couldn't load this shift report"}
        </p>
        <p className="text-sm text-muted-foreground">
          {notFound
            ? "This cash session doesn't exist or doesn't belong to your account."
            : error instanceof Error
              ? error.message
              : "Something went wrong."}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to={`/app/cash-drawer/sessions/${sessionId}`}>Back to session</Link>
        </Button>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="print-hide flex w-full max-w-[80mm] justify-end">
        <PrintButton label="Print shift report" />
      </div>
      <PrintFrame>
        <ZReportContent report={report} />
      </PrintFrame>
    </div>
  );
}
