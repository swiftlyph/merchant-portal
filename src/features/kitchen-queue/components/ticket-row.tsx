import { IconAlertTriangle, IconClock, IconDots } from "@tabler/icons-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCompleteTicket } from "../use-complete-ticket";
import { useTickingSeconds } from "../use-ticking-seconds";
import { useTripleClick } from "../use-triple-click";
import { formatWaitingTime, staleness } from "../waiting-time";
import type { KitchenOrder } from "../types";

const STALENESS_BADGE: Record<
  ReturnType<typeof staleness>,
  { label: string; variant: "secondary" | "outline" | "destructive" }
> = {
  normal: { label: "On time", variant: "secondary" },
  warning: { label: "Waiting", variant: "outline" },
  urgent: { label: "Urgent", variant: "destructive" },
};

/** The compact scanning-view row — same gesture/keyboard rules as TicketCard. */
export function TicketRow({ order }: { order: KitchenOrder }) {
  const { complete, isPending } = useCompleteTicket(order.id);
  const waitingSeconds = useTickingSeconds(order.waiting_seconds);
  const level = staleness(waitingSeconds);
  const badge = STALENESS_BADGE[level];

  const { progress, requiredClicks, register, reset } = useTripleClick(complete);

  return (
    <TableRow
      data-slot="ticket-row"
      className={cn(
        "cursor-pointer select-none",
        isPending && "pointer-events-none opacity-50",
        level === "urgent" && "bg-destructive/5",
      )}
      role="button"
      tabIndex={0}
      aria-label={`Order ${order.order_number}, waiting ${formatWaitingTime(waitingSeconds)}. Click three times, or use the menu, to mark it complete.`}
      onClick={() => {
        if (!isPending) register();
      }}
      onKeyDown={(e) => {
        if (isPending) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          register();
        } else if (e.key === "Escape") {
          reset();
        }
      }}
    >
      <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge variant={badge.variant} className="gap-1">
            {level === "urgent" ? <IconAlertTriangle className="size-3" /> : <IconClock className="size-3" />}
            {badge.label}
          </Badge>
          <span className="tabular-nums text-muted-foreground">
            {formatWaitingTime(waitingSeconds)}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <ul className="flex flex-col gap-1">
          {order.items.map((item) => (
            <li key={item.id}>
              <span className="font-medium">{item.quantity}× </span>
              {item.product_name}
              {item.add_ons.length > 0 && (
                <span className="text-muted-foreground"> ({item.add_ons.join(", ")})</span>
              )}
            </li>
          ))}
        </ul>
      </TableCell>
      <TableCell>
        {progress > 0 && (
          <>
            <span
              aria-hidden
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-black tracking-wide text-white uppercase",
                progress >= requiredClicks - 1 ? "bg-destructive" : "bg-primary",
              )}
            >
              {progress}×
            </span>
            <span className="sr-only" aria-live="polite">
              {progress} of {requiredClicks} clicks
            </span>
          </>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`More actions for order ${order.order_number}`}
              onClick={(e) => e.stopPropagation()}
            >
              <IconDots />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem disabled={isPending} onSelect={() => complete()}>
              Complete order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
