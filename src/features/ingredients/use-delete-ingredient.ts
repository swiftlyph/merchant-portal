import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteIngredient } from "./api";
import { ApiError } from "@/lib/api/client";
import type { Ingredient } from "./types";

/**
 * Deletes an ingredient and refreshes the ingredients list. A 409
 * `ingredient_in_use` means some product's recipe still references it —
 * surfaced as a toast rather than a field error, since there's no form
 * this action came from (see DeleteIngredientButton). A 404 means someone
 * else deleted it first, which is still "gone".
 */
export function useDeleteIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ingredient: Ingredient) => deleteIngredient(ingredient.id),
    onSuccess: (_data, ingredient) => {
      toast.success("Ingredient deleted", { description: ingredient.name });
      void queryClient.invalidateQueries({ queryKey: ["ingredients", "list"] });
    },
    onError: (error: unknown, ingredient) => {
      if (error instanceof ApiError && error.status === 404) {
        toast.info("Ingredient was already deleted", { description: ingredient.name });
        void queryClient.invalidateQueries({ queryKey: ["ingredients", "list"] });
        return;
      }
      if (error instanceof ApiError && error.status === 409) {
        toast.error("Can't delete this ingredient", {
          description: "It's still used in one or more product recipes.",
        });
        return;
      }
      toast.error("Couldn't delete ingredient", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });
}
