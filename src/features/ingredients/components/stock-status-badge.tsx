import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StockStatus } from "../types";

/**
 * Uses the app's success/warning tokens (index.css) rather than raw colors,
 * and the destructive badge variant for out-of-stock, so all three states
 * read consistently in light and dark.
 */
const CLASS_BY_STATUS: Record<StockStatus, string> = {
  in_stock: "bg-success/15 text-success-foreground dark:text-success",
  low_stock: "bg-warning/20 text-warning-foreground dark:text-warning",
  out_of_stock: "",
};

const LABEL_BY_STATUS: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  if (status === "out_of_stock") {
    return <Badge variant="destructive">{LABEL_BY_STATUS[status]}</Badge>;
  }
  return (
    <Badge variant="secondary" className={cn(CLASS_BY_STATUS[status])}>
      {LABEL_BY_STATUS[status]}
    </Badge>
  );
}
