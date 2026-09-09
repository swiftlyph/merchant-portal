import { IconAlertTriangle, IconClock, IconDots } from "@tabler/icons-react";
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
 * A jagged, torn-paper edge along the BOTTOM of the header block, cut with
 * `clip-path: polygon(...)` rather than drawn on top of anything — the
 * header's own background ends in a zigzag silhouette, and the body block
 * sitting directly beneath shows through the notches. That's what makes it
 * read as torn paper rather than a printed zigzag pattern laid over a
 * straight edge. The polygon is generated from a tooth count rather than
 * hand-written, so it can't drift out of sync if that count changes.
 */
const TOOTH_COUNT = 16;
const TOOTH_DEPTH_PX = 8;

function sawtoothBottomClipPath(teeth: number): string {
  const points: string[] = ["0% 0%", "100% 0%", "100% 100%"];
  // Right to left along the bottom edge, alternating the full height and
  // (height - depth) so the edge zigzags rather than running straight.
  for (let i = teeth; i >= 0; i--) {
    const x = (i / teeth) * 100;
    const y = i % 2 === 0 ? "100%" : `calc(100% - ${TOOTH_DEPTH_PX}px)`;
    points.push(`${x}% ${y}`);
  }
  points.push("0% 100%");
  return `polygon(${points.join(", ")})`;
}

const SAWTOOTH_BOTTOM_CLIP_PATH = sawtoothBottomClipPath(TOOTH_COUNT);

/**
 * A ticket sized for arm's-length reading, styled after a printed kitchen
 * chit: a staleness-colored header torn off along a sawtooth edge,
 * monospace numerals, dashed item rules below. Triple-click completes it
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
    <div
      data-slot="ticket-card"
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl bg-card font-mono shadow-md ring-1 ring-foreground/5 transition-opacity dark:ring-foreground/10",
        "cursor-pointer touch-none select-none",
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
      <div
        style={{ clipPath: SAWTOOTH_BOTTOM_CLIP_PATH, paddingBottom: TOOTH_DEPTH_PX }}
        className={cn(
          "flex flex-col",
          level === "normal" && "bg-muted",
          level === "warning" && "bg-secondary",
          level === "urgent" && "bg-destructive/10",
        )}
      >
        <div className="flex items-start justify-between gap-2 px-5 pt-5">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs tracking-widest text-muted-foreground uppercase">Order</span>
            <span className="text-2xl font-bold tracking-tight">{order.order_number}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="font-sans"
                aria-label={`More actions for order ${order.order_number}`}
                onClick={(e) => e.stopPropagation()}
              >
                <IconDots />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem disabled={isPending} onSelect={() => complete()}>
                Complete order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 px-5 pt-3 font-sans">
          <Badge variant={badge.variant} className="gap-1">
            {level === "urgent" ? <IconAlertTriangle className="size-3" /> : <IconClock className="size-3" />}
            {badge.label}
          </Badge>
          <span className="text-lg font-medium tabular-nums text-muted-foreground">
            {formatWaitingTime(waitingSeconds)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 bg-card px-5 pt-4 pb-4">
        <ul className="flex flex-col gap-3">
          {order.items.map((item, index) => (
            <li key={item.id}>
              {index > 0 && <div className="mb-3 border-t border-dashed border-border" />}
              <div className="flex items-baseline gap-2 text-base">
                <span className="font-bold tabular-nums">{item.quantity}×</span>
                <span className="font-sans">{item.product_name}</span>
              </div>
              {item.add_ons.length > 0 && (
                <div className="mt-1 pl-6 text-sm text-muted-foreground">
                  {item.add_ons.map((addOn) => (
                    <div key={addOn}>+ {addOn}</div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>

        {progress > 0 && (
          <div
            className="mt-1 flex items-center gap-1.5 border-t border-dashed border-border pt-3 font-sans text-sm text-muted-foreground"
            aria-live="polite"
          >
            <span>
              {progress}/{requiredClicks} — click {requiredClicks - progress} more time
              {requiredClicks - progress === 1 ? "" : "s"} to complete
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
