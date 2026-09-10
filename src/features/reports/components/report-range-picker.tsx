import { useState } from "react";
import { IconCalendar } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MAX_RANGE_DAYS,
  REPORT_RANGE_PRESETS,
  isRangeWithinLimit,
  rangeDayCount,
  resolvePreset,
  type ReportRange,
  type ReportRangePreset,
} from "../date-range";

function formatDisplay(dateParam: string): string {
  if (!dateParam) return "";
  const parts = dateParam.split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function matchingPreset(range: ReportRange): ReportRangePreset {
  for (const { value } of REPORT_RANGE_PRESETS) {
    const resolved = resolvePreset(value);
    if (resolved.from === range.from && resolved.to === range.to) return value;
  }
  return "custom";
}

/**
 * Presets (Today, Yesterday, Last 7 days, This month, Last month) plus a
 * custom range via the calendar popover. Guards MAX_RANGE_DAYS client-side
 * with a clear message before it ever reaches the server — the server's own
 * `range_too_large` 422 is still handled by the caller for anything this
 * client-side check misses (e.g. a range typed straight into the URL).
 */
export function ReportRangePicker({
  range,
  onChange,
  disabled,
}: {
  range: ReportRange;
  onChange: (range: ReportRange) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>({});
  const preset = matchingPreset(range);
  const withinLimit = isRangeWithinLimit(range.from, range.to);

  function handlePresetChange(value: string) {
    if (value === "custom") {
      setOpen(true);
      return;
    }
    onChange(resolvePreset(value as Exclude<ReportRangePreset, "custom">));
  }

  function toDateParam(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function applyCustomRange(from: Date, to: Date) {
    const nextRange = { from: toDateParam(from), to: toDateParam(to) };
    onChange(nextRange);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={preset === "custom" ? "custom" : preset} onValueChange={handlePresetChange} disabled={disabled}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORT_RANGE_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>

        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) setDraft({});
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled} className="gap-1.5">
              <IconCalendar className="size-4" />
              {formatDisplay(range.from)} – {formatDisplay(range.to)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: draft.from, to: draft.to }}
              onSelect={(selected) => {
                setDraft({ from: selected?.from, to: selected?.to });
                if (selected?.from && selected?.to) {
                  applyCustomRange(selected.from, selected.to);
                }
              }}
              numberOfMonths={2}
              defaultMonth={new Date(`${range.from}T00:00:00`)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {!withinLimit && (
        <p className="text-sm text-destructive">
          That range spans {rangeDayCount(range.from, range.to)} days — the maximum is{" "}
          {MAX_RANGE_DAYS}. Choose a narrower range.
        </p>
      )}
    </div>
  );
}
