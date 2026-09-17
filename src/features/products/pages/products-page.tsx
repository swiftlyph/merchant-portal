import { useSearchParams } from "react-router-dom";
import { useProducts } from "../use-products";
import { ProductStatusBadge } from "../components/product-status-badge";
import { AddProductDialog } from "../components/add-product-dialog";
import { DeleteProductButton } from "../components/delete-product-button";
import { EditProductButton } from "../components/edit-product-dialog";
import { EditRecipeButton } from "../components/edit-recipe-dialog";
import { ViewProductButton } from "../components/view-product-dialog";
import type { ProductStatus } from "../types";
import { ListPagination } from "@/components/list-pagination";
import { Badge } from "@/components/ui/badge";
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
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

/** Matches ListPagination's own default options — kept explicit here so an invalid ?per_page= falls back predictably. */
const PER_PAGE_OPTIONS = [15, 25, 50];
const DEFAULT_PER_PAGE = 15;

function isProductStatus(value: string): value is ProductStatus {
  return value === "active" || value === "inactive";
}

/**
 * `/app/products`. Status, page and page size live in the URL
 * (?status=&page=&per_page=) and drive the server query, same as the
 * orders list. The search box (?q=) is a client-side filter over the
 * fetched page by name or product ID — the API has no search param yet —
 * kept in the URL so the view is shareable, but never sent to useProducts.
 */
export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get("status") ?? "all";
  const queryParam = searchParams.get("q") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const perPageParam = Number(searchParams.get("per_page") ?? String(DEFAULT_PER_PAGE));
  const perPage = PER_PAGE_OPTIONS.includes(perPageParam) ? perPageParam : DEFAULT_PER_PAGE;

  const filters = {
    status: isProductStatus(statusParam) ? statusParam : undefined,
    page,
    perPage,
  };

  const { data, isPending, isError, error, refetch, isFetching } = useProducts(filters);

  const normalizedQuery = queryParam.trim().toLowerCase();
  const visibleProducts = normalizedQuery
    ? (data?.data ?? []).filter(
        (product) =>
          product.name.toLowerCase().includes(normalizedQuery) ||
          product.code.toLowerCase().includes(normalizedQuery),
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
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">
            The catalog of items this merchant sells at the POS.
          </p>
        </div>
        <AddProductDialog />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="products-search" className="text-xs text-muted-foreground">
            Search
          </label>
          <Input
            id="products-search"
            type="search"
            placeholder="Name or product ID…"
            className="w-48"
            value={queryParam}
            onChange={(e) => updateParams({ q: e.target.value || null })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="products-status-filter" className="text-xs text-muted-foreground">
            Status
          </label>
          <Select
            value={statusParam}
            onValueChange={(value) =>
              updateParams({ status: value === "all" ? null : value, page: null })
            }
          >
            <SelectTrigger id="products-status-filter" className="w-40">
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
            {error instanceof Error ? error.message : "Couldn't load products."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isPending && !isError && data && visibleProducts.length === 0 && (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium">No products found</p>
          <p className="text-sm text-muted-foreground">
            {normalizedQuery
              ? `No products on this page match "${queryParam}".`
              : "Try a different status filter."}
          </p>
        </div>
      )}

      {!isPending && !isError && data && visibleProducts.length > 0 && (
        <>
          <Table className={isFetching ? "opacity-60 transition-opacity" : undefined}>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Product ID</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Recipe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="font-mono text-xs">{product.code || "—"}</TableCell>
                  <TableCell>{product.category || "—"}</TableCell>
                  <TableCell>{product.price_formatted}</TableCell>
                  <TableCell>
                    {product.recipe.length === 0 ? (
                      <span className="text-muted-foreground">None</span>
                    ) : (
                      <Badge variant={product.in_stock ? "secondary" : "destructive"}>
                        {product.recipe.length} ingredient{product.recipe.length === 1 ? "" : "s"}
                        {product.in_stock ? "" : " · out of stock"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <ProductStatusBadge status={product.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ViewProductButton product={product} />
                      <EditProductButton product={product} />
                      <EditRecipeButton product={product} />
                      <DeleteProductButton product={product} />
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
