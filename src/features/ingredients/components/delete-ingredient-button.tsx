import { Trash2Icon } from "lucide-react";
import { useDeleteIngredient } from "../use-delete-ingredient";
import type { Ingredient } from "../types";
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
 * Trash icon for an ingredient row. Always confirms first. The server
 * refuses the delete (409 `ingredient_in_use`) if any product's recipe
 * still references it — that refusal surfaces as a toast (see
 * useDeleteIngredient), not blocked here client-side, since only the
 * server knows every recipe across the catalog.
 */
export function DeleteIngredientButton({ ingredient }: { ingredient: Ingredient }) {
  const mutation = useDeleteIngredient();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${ingredient.name}`}
          title="Delete"
          disabled={mutation.isPending}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2Icon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {ingredient.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the ingredient from your inventory. It can&apos;t be deleted while a
            product&apos;s recipe still uses it. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => mutation.mutate(ingredient)}>
            Delete ingredient
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
