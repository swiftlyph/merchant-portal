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

const STALENESS_HEADER_BG: Record<ReturnType<typeof staleness>, string> = {
  normal: "bg-muted",
  warning: "bg-secondary",
  urgent: "bg-destructive/10",
};

/** Diameter of the punched-out stub notch, in pixels. */
const NOTCH_SIZE = 20;

/**
 * A compact "1×"/"2×" combo counter, arcade-style — plain and unambiguous
 * on purpose (a hit-combo readout, not a cute label) so it's immediately
 * legible at arm's length. Overlaid on the card (absolute positioned)
 * rather than pushed into the layout, so it never changes the card's
 * height or reflows its neighbours in the grid — a combo popup in a game
 * doesn't resize the score panel either.
 */
function ComboBadge({ progress, required }: { progress: number; required: number }) {
  if (progress <= 0) return null;

  const isFinal = progress >= required - 1;

  return (
    <>
      <div
        key={progress}
        aria-hidden
        className={cn(
          "animate-in zoom-in-50 fade-in slide-in-from-top-1 pointer-events-none absolute -top-3 -right-3 z-10 flex size-9 items-center justify-center rounded-full border-2 border-background text-sm font-black tabular-nums text-white shadow-lg duration-200",
          isFinal ? "bg-destructive" : "bg-primary",
        )}
      >
        {progress}×
      </div>
      {/* The visual badge is aria-hidden (a bare "2×" reads as noise out
          of context) — this carries the same information as an actual
          sentence for assistive tech. */}
      <span className="sr-only" aria-live="polite">
        {progress} of {required} clicks — click {required - progress} more time
        {required - progress === 1 ? "" : "s"} to complete
      </span>
    </>
  );
}

/**
 * The classic ticket-stub divider: a semicircular notch bitten out of each
 * side edge with a dashed perforation line between them, the way an event
 * ticket separates its stub from the main body. The notches are circles
 * colored to match the PAGE background (not the card's), overlaid at the
 * card's own edges and half-clipped by the card's overflow-hidden — that
 * half-circle bite is what reads as "punched through," not printed on top.
 */
function StubDivider() {
  return (
    <div className="relative" aria-hidden>
      <div
        className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background"
        style={{ width: NOTCH_SIZE, height: NOTCH_SIZE }}
      />
      <div
        className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 rounded-full bg-background"
        style={{ width: NOTCH_SIZE, height: NOTCH_SIZE }}
      />
      <div className="border-t-2 border-dashed border-border" />
    </div>
  );
}

/**
 * A ticket sized for arm's-length reading, styled after an event-ticket
 * stub: a staleness-colored header, then a punched-notch perforation (two
 * half-circle bites out of the side edges plus a dashed rule) separating
 * it from the item list, the way a real ticket tears along its stub line.
 * Triple-click completes it (progress shown as 1/3 -> 2/3 so the gesture
 * teaches itself); the dropdown's "Complete order" item is the
 * keyboard/screen-reader path — the gesture is never the ONLY way to
 * finish a ticket. No confirm dialog on either path: the gesture (or the
 * explicit menu action) IS the confirmation.
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
        "relative transition-opacity",
        "cursor-pointer touch-none select-none",
        isPending && "pointer-events-none opacity-50",
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
      {/* Escapes the clipped shell below so it never gets cut off at the rounded corner. */}
      <ComboBadge progress={progress} required={requiredClicks} />

      <div
        className={cn(
          "flex h-96 flex-col overflow-hidden rounded-2xl bg-card font-mono shadow-md ring-1 ring-foreground/5 dark:ring-foreground/10",
          level === "urgent" && "ring-2 ring-destructive/60",
        )}
      >
        <div className={cn("flex flex-col", STALENESS_HEADER_BG[level])}>
          <div className="flex items-start justify-between gap-2 px-5 pt-5 pb-3">
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

          <div className="flex items-center gap-2 px-5 pb-5 font-sans">
            <Badge variant={badge.variant} className="gap-1">
              {level === "urgent" ? <IconAlertTriangle className="size-3" /> : <IconClock className="size-3" />}
              {badge.label}
            </Badge>
            <span className="text-lg font-medium tabular-nums text-muted-foreground">
              {formatWaitingTime(waitingSeconds)}
            </span>
          </div>
        </div>

        <StubDivider />

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-card px-5 pt-4 pb-4">
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
        </div>
      </div>
    </div>
  );
}
