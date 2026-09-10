/**
 * Reports date-range helpers: presets, "YYYY-MM-DD" formatting in the
 * BROWSER's local time (matching todayDateParam in features/dashboard/today.ts
 * and the server's date_format:Y-m-d filter — never toISOString, which is
 * UTC and would land on the wrong day near midnight), and the client-side
 * mirror of ReportDateRangeRequest::MAX_RANGE_DAYS so an obviously-too-large
 * custom range is caught before a round trip, while the server's own
 * `range_too_large` 422 is still the source of truth (see use-sales-summary.ts).
 */

/** Mirrors App\Domains\Orders\Http\Requests\ReportDateRangeRequest::MAX_RANGE_DAYS. */
export const MAX_RANGE_DAYS = 366;

export type ReportRangePreset =
  | "today"
  | "yesterday"
  | "last-7-days"
  | "this-month"
  | "last-month"
  | "custom";

export interface ReportRange {
  from: string;
  to: string;
}

function toDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Resolves a preset to a concrete { from, to } range, anchored on "now". */
export function resolvePreset(preset: Exclude<ReportRangePreset, "custom">, now = new Date()): ReportRange {
  switch (preset) {
    case "today": {
      const today = toDateParam(now);
      return { from: today, to: today };
    }
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const value = toDateParam(yesterday);
      return { from: value, to: value };
    }
    case "last-7-days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { from: toDateParam(start), to: toDateParam(now) };
    }
    case "this-month": {
      return { from: toDateParam(startOfMonth(now)), to: toDateParam(now) };
    }
    case "last-month": {
      const lastMonthAnchor = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: toDateParam(startOfMonth(lastMonthAnchor)), to: toDateParam(endOfMonth(lastMonthAnchor)) };
    }
  }
}

export const REPORT_RANGE_PRESETS: { value: Exclude<ReportRangePreset, "custom">; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last-7-days", label: "Last 7 days" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
];

/** Inclusive day count between two "YYYY-MM-DD" strings — mirrors the server's diffInDays + 1. */
export function rangeDayCount(from: string, to: string): number {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  const diffMs = toDate.getTime() - fromDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/** True when a range is well-formed (from <= to) and within MAX_RANGE_DAYS. */
export function isRangeWithinLimit(from: string, to: string): boolean {
  if (!from || !to) return true;
  if (from > to) return false;
  return rangeDayCount(from, to) <= MAX_RANGE_DAYS;
}

export const DEFAULT_RANGE: ReportRange = resolvePreset("today");
