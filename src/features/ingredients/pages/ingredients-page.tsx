import { useSearchParams } from "react-router-dom";
import { useIngredients } from "../use-ingredients";
import { StockStatusBadge } from "../components/stock-status-badge";
import { AddIngredientDialog } from "../components/add-ingredient-dialog";
import { EditIngredientButton } from "../components/edit-ingredient-dialog";
import { DeleteIngredientButton } from "../components/delete-ingredient-button";
import type { StockStatus } from "../types";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All stock" },
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];

/** Matches ListPagination's own default options — kept explicit here so an invalid ?per_page= falls back predictably. */
const PER_PAGE_OPTIONS = [15, 25, 50];
const DEFAULT_PER_PAGE = 15;

function isStockStatus(value: string): value is StockStatus {
  return value === "in_stock" || value === "low_stock" || value === "out_of_stock";
}

/**
 * `/app/ingredients`. Ingredients ARE this merchant's inventory — a
 * product carries no stock of its own, only its recipe's ingredients do
 * (see the Products page's "Recipe" column/dialog). Stock status, page and
 * page size live in the URL (?status=&page=&per_page=) and drive the
 * server query; the search box (?q=) filters the fetched page
 * client-side by name or ingredient ID.
 */
export function IngredientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get("status") ?? "all";
  const queryParam = searchParams.get("q") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const perPageParam = Number(searchParams.get("per_page") ?? String(DEFAULT_PER_PAGE));
  const perPage = PER_PAGE_OPTIONS.includes(perPageParam) ? perPageParam : DEFAULT_PER_PAGE;

  const filters = {
    status: isStockStatus(statusParam) ? statusParam : undefined,
    page,
    perPage,
  };

  const { data, isPending, isError, error, refetch, isFetching } = useIngredients(filters);

  const normalizedQuery = queryParam.trim().toLowerCase();
  const visibleIngredients = normalizedQuery
    ? (data?.data ?? []).filter(
        (ingredient) =>
          ingredient.name.toLowerCase().includes(normalizedQuery) ||
          ingredient.code.toLowerCase().includes(normalizedQuery),
      )
    : (data?.data ?? []);

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    setSearchParams(params);
  }

  const hasFilters = statusParam !== "all" || queryParam !== "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Ingredients</h1>
          <p className="text-sm text-muted-foreground">
            Stock on hand for every ingredient. Attach one to a product&apos;s recipe from the
            Products page to have sales deduct it automatically.
          </p>
        </div>
        <AddIngredientDialog />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ingredients-search" className="text-xs text-muted-foreground">
            Search
          </label>
          <Input
            id="ingredients-search"
            type="search"
            placeholder="Name or ingredient ID…"
            className="w-48"
            value={queryParam}
            onChange={(e) => updateParams({ q: e.target.value || null })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="ingredients-status-filter" className="text-xs text-muted-foreground">
            Stock status
          </label>
          <Select
            value={statusParam}
            onValueChange={(value) =>
              updateParams({ status: value === "all" ? null : value, page: null })
            }
          >
            <SelectTrigger id="ingredients-status-filter" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateParams({ status: null, q: null, page: null })}
          >
            Clear filters
          </Button>
        )}
      </div>

      {isPending && <ListSkeleton />}

      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Couldn't load ingredients."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isPending && !isError && data && visibleIngredients.length === 0 && (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium">No ingredients found</p>
          <p className="text-sm text-muted-foreground">
            {normalizedQuery
              ? `No ingredients on this page match "${queryParam}".`
              : "Try a different stock status filter."}
          </p>
        </div>
      )}

      {!isPending && !isError && data && visibleIngredients.length > 0 && (
        <>
          <Table className={isFetching ? "opacity-60 transition-opacity" : undefined}>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead>Ingredient ID</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Low-stock at</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleIngredients.map((ingredient) => (
                <TableRow key={ingredient.id}>
                  <TableCell className="font-medium">{ingredient.name}</TableCell>
                  <TableCell className="font-mono text-xs">{ingredient.code || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {ingredient.quantity_on_hand_formatted}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {ingredient.low_stock_threshold_formatted}
                  </TableCell>
                  <TableCell>
                    <StockStatusBadge status={ingredient.stock_status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <EditIngredientButton ingredient={ingredient} />
                      <DeleteIngredientButton ingredient={ingredient} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <ListPagination
            meta={data.meta}
            page={page}
            onPageChange={(next) => updateParams({ page: next > 1 ? String(next) : null })}
            perPage={perPage}
            perPageOptions={PER_PAGE_OPTIONS}
            onPerPageChange={(next) =>
              updateParams({ per_page: next === DEFAULT_PER_PAGE ? null : String(next), page: null })
            }
          />
        </>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
