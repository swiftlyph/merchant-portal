import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateIngredient } from "./api";
import type { Ingredient, UpdateIngredientInput } from "./types";

/**
 * Updates an ingredient and refreshes the ingredients list, plus the
 * products list/detail: a stock or threshold change can flip whether a
 * recipe-bearing product is `in_stock`, the same reason the backend's
 * IngredientObserver invalidates the POS menu cache on every save — see
 * gasa-api README § "The POS menu cache, invalidated automatically".
 */
export function useUpdateIngredient(
  id: number | string,
  options: { onSuccess?: (ingredient: Ingredient) => void } = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateIngredientInput) => updateIngredient(id, input),
    onSuccess: (ingredient) => {
      toast.success("Ingredient updated", { description: ingredient.name });
      void queryClient.invalidateQueries({ queryKey: ["ingredients", "list"] });
      void queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      void queryClient.invalidateQueries({ queryKey: ["products", "detail"] });
      options.onSuccess?.(ingredient);
    },
  });
}
