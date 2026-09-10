import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DEFAULT_RANGE, type ReportRange } from "./date-range";

/**
 * The single source of truth for the reports page's selected range: lives
 * in the `from`/`to` URL query params so the view is shareable and
 * refresh-proof, and is the ONE thing every section (summary, sales-by-day,
 * top-items) reads from — never a separate piece of local state per
 * section, so they can't drift into describing different periods.
 */
export function useReportRange(): {
  range: ReportRange;
  setRange: (range: ReportRange) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const range = useMemo<ReportRange>(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    return {
      from: from || DEFAULT_RANGE.from,
      to: to || DEFAULT_RANGE.to,
    };
  }, [searchParams]);

  const setRange = useCallback(
    (next: ReportRange) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set("from", next.from);
          params.set("to", next.to);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { range, setRange };
}
