import { IconAlertTriangle, IconClock, IconDots } from "@tabler/icons-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

/**
 * A ticket sized for arm's-length reading. Triple-click completes it
 * (progress shown as 1/3 -> 2/3 so the gesture teaches itself); the
 * dropdown's "Complete order" item is the keyboard/screen-reader path —
 * the gesture is never the ONLY way to finish a ticket. No confirm dialog
 * on either path: the gesture (or the explicit menu action) IS the
 * confirmation.
 */
export function TicketCard({ order }: { order: KitchenOrder }) {
  const { complete, isPending } = useCompleteTicket(order.id);
  const waitingSeconds = useTickingSeconds(order.waiting_seconds);
  const level = staleness(waitingSeconds);
  const badge = STALENESS_BADGE[level];

  const { progress, requiredClicks, register, reset } = useTripleClick(complete);

  return (
    <Card
      data-slot="ticket-card"
      className={cn(
        "cursor-pointer touch-none select-none transition-opacity",
        isPending && "pointer-events-none opacity-50",
        level === "urgent" && "ring-2 ring-destructive/60",
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
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="text-2xl font-bold">{order.order_number}</div>
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
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={badge.variant} className="gap-1">
            {level === "urgent" ? <IconAlertTriangle className="size-3" /> : <IconClock className="size-3" />}
            {badge.label}
          </Badge>
          <span className="text-lg font-medium tabular-nums text-muted-foreground">
            {formatWaitingTime(waitingSeconds)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {order.items.map((item) => (
            <li key={item.id} className="text-base">
              <span className="font-medium">{item.quantity}× </span>
              {item.product_name}
              {item.add_ons.length > 0 && (
                <div className="pl-5 text-sm text-muted-foreground">
                  {item.add_ons.join(", ")}
                </div>
              )}
            </li>
          ))}
        </ul>
        {progress > 0 && (
          <div
            className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <span>
              {progress}/{requiredClicks} — click {requiredClicks - progress} more time
              {requiredClicks - progress === 1 ? "" : "s"} to complete
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
