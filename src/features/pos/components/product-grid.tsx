import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MenuProduct } from "../types";

/**
 * Touch-first: each card is a single tap-to-add button, sized generously
 * (not a cursor-sized hit target) since this is a tablet register, not a
 * desktop list. Only available products render — an unavailable item is
 * simply not something a barista can ring up right now.
 */
export function ProductGrid({
  products,
  isLoading,
  onAdd,
}: {
  products: MenuProduct[];
  isLoading: boolean;
  onAdd: (product: MenuProduct) => void;
}) {
  const [query, setQuery] = useState("");

  const available = products.filter((p) => p.is_available);
  const filtered = query.trim()
    ? available.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : available;

  return (
    <div className="flex h-full flex-col gap-3">
      <Input
        type="search"
        placeholder="Search menu…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search menu"
        className="h-11"
      />

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && products.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium">No products yet</p>
          <p className="text-sm text-muted-foreground">Add them in the catalog.</p>
        </div>
      )}

      {!isLoading && products.length > 0 && filtered.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No items match “{query}”.</p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => onAdd(product)}
              className={cn(
                "flex min-h-24 flex-col items-start justify-between gap-2 rounded-2xl border border-border bg-card p-4 text-left shadow-sm",
                "transition-colors active:translate-y-px active:bg-muted",
                "touch-manipulation select-none",
              )}
            >
              <span className="font-medium">{product.name}</span>
              <span className="text-lg font-semibold tabular-nums text-primary">
                {product.price_formatted}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
