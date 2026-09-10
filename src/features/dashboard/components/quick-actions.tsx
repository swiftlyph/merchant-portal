import { Link } from "react-router-dom";
import { IconClockHour4, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

/** Touch-first: "New order" is the one action a merchant reaches for constantly, so it's the obvious, prominent button — everything else is secondary. */
export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="lg" className="h-14 gap-2 px-6 text-base" asChild>
        <Link to="/app/pos">
          <IconPlus /> New order
        </Link>
      </Button>
      <Button size="lg" variant="outline" className="h-14 gap-2 px-6 text-base" asChild>
        <Link to="/app/kitchen-queue">
          <IconClockHour4 /> Queue
        </Link>
      </Button>
    </div>
  );
}
