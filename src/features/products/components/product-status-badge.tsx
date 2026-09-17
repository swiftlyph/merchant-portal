import { Badge } from "@/components/ui/badge";
import type { ProductStatus } from "../types";

const VARIANT_BY_STATUS: Record<ProductStatus, "default" | "outline"> = {
  active: "default",
  inactive: "outline",
};

const LABEL_BY_STATUS: Record<ProductStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{LABEL_BY_STATUS[status]}</Badge>;
}
