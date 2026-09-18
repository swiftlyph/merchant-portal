import { Badge } from "@/components/ui/badge";
import { actionDomain, formatActionLabel } from "../format";

/** Color-codes by the verb, not the domain: deletions/removals stand out as destructive regardless of which domain they're in. */
function variantFor(action: string): "default" | "secondary" | "destructive" {
  if (action.endsWith("deleted") || action.endsWith("removed") || action.endsWith("voided")) {
    return "destructive";
  }
  if (action.endsWith("created") || action.endsWith("added") || action.endsWith("checked_out")) {
    return "default";
  }
  return "secondary";
}

export function ActionBadge({ action }: { action: string }) {
  return (
    <Badge variant={variantFor(action)} title={actionDomain(action)}>
      {formatActionLabel(action)}
    </Badge>
  );
}
