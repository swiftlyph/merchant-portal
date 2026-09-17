import { Trash2Icon } from "lucide-react";
import { useDeleteProduct } from "../use-delete-product";
import type { Product } from "../types";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Trash icon for a product row. Always confirms first — a delete is a hard
 * delete on the backend (its recipe lines go with it; the ingredients
 * themselves are untouched), so there's no undo to offer. The accessible
 * name carries the product name so screen readers and tests can tell one
 * row's button from another.
 */
export function DeleteProductButton({ product }: { product: Product }) {
  const mutation = useDeleteProduct();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${product.name}`}
          title="Delete"
          disabled={mutation.isPending}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2Icon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {product.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the product from your catalog
            {product.recipe.length > 0 ? " along with its recipe" : ""}. This can&apos;t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => mutation.mutate(product)}
          >
            Delete product
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
