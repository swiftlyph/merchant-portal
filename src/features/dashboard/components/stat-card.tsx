import type { ReactNode } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

/**
 * One dashboard stat. Each card owns its own loading/error state so one
 * query failing (say, the kitchen summary) never takes the others — or the
 * whole page — down with it; the caller just passes what it has.
 */
export function StatCard({
  label,
  value,
  isPending,
  isError,
  errorMessage,
  onRetry,
  icon,
}: {
  label: string;
  value: ReactNode;
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isPending && <Skeleton className="h-9 w-24" />}

        {!isPending && isError && (
          <div className="flex flex-col items-start gap-1.5">
            <div className="flex items-center gap-1.5 text-sm text-destructive">
              <IconAlertTriangle className="size-4 shrink-0" />
              {errorMessage ?? "Couldn't load."}
            </div>
            {onRetry && (
              <Button variant="ghost" size="xs" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        )}

        {!isPending && !isError && <div className="text-3xl font-bold tabular-nums">{value}</div>}
      </CardContent>
    </Card>
  );
}
