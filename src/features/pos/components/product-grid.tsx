import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { MenuProduct } from "../types";

/** A product with no category (demo-seeded, or created before categorization) is grouped here rather than hidden. */
const UNCATEGORIZED_TAB = "__uncategorized__";
const UNCATEGORIZED_LABEL = "Other";
const ALL_TAB = "all";

/**
 * Distinct categories actually present, in first-seen order (which is
 * alphabetical by name, since the caller already sorted by name) — not
 * the full fixed catalog list, so a merchant with only Drinks and Bakery
 * items never sees empty tabs for Snacks/Food/Retail.
 */
function categoriesIn(products: MenuProduct[]): string[] {
  const seen = new Set<string>();
  for (const product of products) {
    if (product.category) seen.add(product.category);
  }
  return Array.from(seen);
}

/**
 * Touch-first: each card is a single tap-to-add button, sized generously
 * (not a cursor-sized hit target) since this is a tablet register, not a
 * desktop list. Only available products render — an unavailable item is
 * simply not something a barista can ring up right now.
 *
 * Category tabs filter the grid client-side over the already-fetched menu
 * (no extra request) — tabs only appear once there's more than one
 * category to split on, so a merchant with an uncategorized/single-category
 * menu keeps today's flat grid exactly as it was.
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
  const [activeCategory, setActiveCategory] = useState(ALL_TAB);

  const available = products.filter((p) => p.is_available);

  const categories = useMemo(() => categoriesIn(available), [available]);
  const hasUncategorized = available.some((p) => !p.category);
  const showTabs = categories.length + (hasUncategorized ? 1 : 0) > 1;

  const byCategory =
    !showTabs || activeCategory === ALL_TAB
      ? available
      : available.filter((p) =>
          activeCategory === UNCATEGORIZED_TAB ? !p.category : p.category === activeCategory,
        );

  const filtered = query.trim()
    ? byCategory.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : byCategory;

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

      {showTabs && (
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value={ALL_TAB}>All</TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
            {hasUncategorized && (
              <TabsTrigger value={UNCATEGORIZED_TAB}>{UNCATEGORIZED_LABEL}</TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      )}

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
          <p className="text-sm text-muted-foreground">
            {query.trim()
              ? `No items match "${query}".`
              : "No items in this category."}
          </p>
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
