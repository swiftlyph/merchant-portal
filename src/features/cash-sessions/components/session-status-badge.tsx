import { Badge } from "@/components/ui/badge";
import type { CashSessionStatus } from "../types";

const VARIANT_BY_STATUS: Record<CashSessionStatus, "default" | "secondary"> = {
  open: "default",
  closed: "secondary",
};

const LABEL_BY_STATUS: Record<CashSessionStatus, string> = {
  open: "Open",
  closed: "Closed",
};

export function SessionStatusBadge({ status }: { status: CashSessionStatus }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{LABEL_BY_STATUS[status]}</Badge>;
}
