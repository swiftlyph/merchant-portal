import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ActionBadge } from "./action-badge";
import { formatDateTime } from "../format";
import type { AuditLogEntry } from "../types";

function ValueBlock({ title, values }: { title: string; values: Record<string, unknown> | null }) {
  if (!values || Object.keys(values).length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
      <div className="rounded-md border border-border bg-muted/40 p-3">
        <dl className="flex flex-col gap-1 text-sm">
          {Object.entries(values).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{key}</dt>
              <dd className="text-right font-mono break-all">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** Slides in the full detail (old/new values, context, IP) for one audit entry — the list row alone doesn't have room for a JSON diff. */
export function EntryDetailsSheet({
  entry,
  open,
  onOpenChange,
}: {
  entry: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-4 overflow-y-auto p-6">
        {entry && (
          <>
            <SheetHeader className="p-0">
              <SheetTitle className="flex items-center gap-2">
                <ActionBadge action={entry.action} />
              </SheetTitle>
              <SheetDescription>{formatDateTime(entry.created_at)}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">By</span>
                <span>
                  {entry.actor.name} ({entry.actor.email})
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Subject</span>
                <span className="font-mono text-xs">
                  {entry.subject_type.split("\\").pop()} #{entry.subject_id}
                </span>
              </div>
              {entry.ip_address && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">IP address</span>
                  <span className="font-mono text-xs">{entry.ip_address}</span>
                </div>
              )}
            </div>

            <ValueBlock title="Before" values={entry.old_values} />
            <ValueBlock title="After" values={entry.new_values} />
            <ValueBlock title="Context" values={entry.context} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
