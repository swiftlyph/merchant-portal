import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "../types";

const VARIANT_BY_STATUS: Record<OrderStatus, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  completed: "default",
  voided: "destructive",
};

const LABEL_BY_STATUS: Record<OrderStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  voided: "Voided",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{LABEL_BY_STATUS[status]}</Badge>;
}
