import { Link } from "react-router-dom";
import { IconAlertTriangle, IconPackage } from "@tabler/icons-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StockStatusBadge } from "@/features/ingredients/components/stock-status-badge";
import type { Ingredient } from "@/features/ingredients/types";

const LOW_STOCK_COUNT = 5;

/**
 * Out-of-stock and low-stock ingredients that need restocking, worst-first.
 * Both are separate GET /merchant/ingredients?status= calls (the endpoint
 * only ever filters by one StockStatus at a time — see ListIngredientsRequest)
 * capped to a handful of rows each; nothing here is computed client-side,
 * every row and its stock_status came straight from the server.
 */
export function LowStockCard({
  outOfStock,
  lowStock,
  isPending,
  isError,
  errorMessage,
  onRetry,
}: {
  outOfStock: Ingredient[] | undefined;
  lowStock: Ingredient[] | undefined;
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
}) {
  const items = [...(outOfStock ?? []), ...(lowStock ?? [])].slice(0, LOW_STOCK_COUNT);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs restocking</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {!isPending && isError && (
          <div className="flex flex-col items-start gap-1.5">
            <div className="flex items-center gap-1.5 text-sm text-destructive">
              <IconAlertTriangle className="size-4 shrink-0" />
              {errorMessage ?? "Couldn't load."}
            </div>
            <Button variant="ghost" size="xs" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}

        {!isPending && !isError && items.length === 0 && (
          <div className="flex flex-col items-center gap-1 py-6 text-center">
            <IconPackage className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">All stocked up</p>
            <p className="text-sm text-muted-foreground">No ingredients running low.</p>
          </div>
        )}

        {!isPending && !isError && items.length > 0 && (
          <ul className="flex flex-col gap-1">
            {items.map((ingredient) => (
              <li
                key={ingredient.id}
                className="flex items-center justify-between gap-3 rounded-2xl px-2 py-2"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{ingredient.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {ingredient.quantity_on_hand_formatted} on hand (threshold{" "}
                    {ingredient.low_stock_threshold_formatted})
                  </span>
                </div>
                <StockStatusBadge status={ingredient.stock_status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <CardFooter>
        <Button variant="ghost" size="sm" className="w-full" asChild>
          <Link to="/app/inventory">View inventory</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
