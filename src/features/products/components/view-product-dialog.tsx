import { useState, type ReactNode } from "react";
import { EyeIcon, PencilIcon } from "lucide-react";
import { useProduct } from "../use-product";
import { ProductStatusBadge } from "./product-status-badge";
import { EditProductDialog } from "./edit-product-dialog";
import { EditRecipeButton } from "./edit-recipe-dialog";
import type { Product } from "../types";
import { StockStatusBadge } from "@/features/ingredients/components/stock-status-badge";
import { UNIT_LABELS } from "@/features/ingredients/units";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** e.g. "Sep 9, 2026, 2:30 PM". */
function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(
    date,
  );
}

/**
 * Eye icon for a product row that opens a read-only detail modal. Opens on
 * the row's data (no loading flash), then refreshes from the show endpoint
 * while open. The accessible name carries the product name so one row's
 * button is distinguishable from another's.
 *
 * Also owns the View → Edit transition: clicking "Edit" inside the detail
 * view closes this dialog and opens EditProductDialog pre-filled with
 * whatever the detail view last fetched (not the possibly-stale row prop
 * it was opened with), so an edit never starts from data older than what
 * was just shown on screen.
 */
export function ViewProductButton({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`View ${product.name}`}
            title="View"
            className="text-muted-foreground hover:text-foreground"
          >
            <EyeIcon />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          {open && (
            <ViewProductDetails
              initial={product}
              onEdit={(current) => {
                setOpen(false);
                setEditing(current);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {editing && (
        <EditProductDialog
          product={editing}
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
        />
      )}
    </>
  );
}

/** Mounted only while the dialog is open, so the query only runs then. */
function ViewProductDetails({
  initial,
  onEdit,
}: {
  initial: Product;
  onEdit: (current: Product) => void;
}) {
  const { data, isError, error, isFetching } = useProduct(initial, { enabled: true });
  const product = data ?? initial;
  const deleted = error instanceof ApiError && error.status === 404;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          {product.name}
          <ProductStatusBadge status={product.status} />
        </DialogTitle>
        <DialogDescription>
          {[product.code, product.category].filter(Boolean).join(" · ")}
        </DialogDescription>
      </DialogHeader>

      {isError && (
        <Alert variant={deleted ? "destructive" : "default"}>
          <AlertDescription>
            {deleted
              ? "This product no longer exists. It may have been deleted on another device."
              : "Couldn't refresh this product. Showing the last known details."}
          </AlertDescription>
        </Alert>
      )}

      <dl
        className={
          "grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm" +
          (isFetching ? " opacity-70 transition-opacity" : "")
        }
      >
        <DetailRow label="Price">
          <span className="font-medium">{product.price_formatted}</span>
          <span className="ml-2 text-muted-foreground">{product.currency}</span>
        </DetailRow>
        <DetailRow label="Product ID">
          {product.code ? <span className="font-mono text-xs">{product.code}</span> : "—"}
        </DetailRow>
        <DetailRow label="Category">{product.category || "—"}</DetailRow>
        <DetailRow label="Description">
          {product.description ? (
            <span className="whitespace-pre-wrap">{product.description}</span>
          ) : (
            "—"
          )}
        </DetailRow>
        <DetailRow label="Created">{formatDateTime(product.created_at)}</DetailRow>
        <DetailRow label="Updated">{formatDateTime(product.updated_at)}</DetailRow>
      </dl>

      <div className="mt-4 flex flex-col gap-2 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Recipe</span>
            <Badge variant={product.in_stock ? "secondary" : "destructive"}>
              {product.in_stock ? "In stock" : "Out of stock"}
            </Badge>
          </div>
          {!deleted && <EditRecipeButton product={product} />}
        </div>

        {product.recipe.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ingredients — always available.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {product.recipe.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-2">
                <span>{`${line.ingredient_name} — ${line.quantity} ${UNIT_LABELS[line.unit]}`}</span>
                <StockStatusBadge status={line.ingredient_stock_status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <DialogFooter className="mt-4">
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
        {!deleted && (
          <Button type="button" onClick={() => onEdit(product)}>
            <PencilIcon />
            Edit
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}
