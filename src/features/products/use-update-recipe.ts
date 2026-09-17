import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateProductRecipe } from "./api";
import { productQueryKey } from "./use-product";
import type { Product, UpdateRecipeInput } from "./types";

/**
 * Replaces a product's whole recipe and refreshes the catalog list and
 * this product's own detail query — its `in_stock` flag can change the
 * moment a recipe is saved (a new ingredient might already be depleted).
 * A separate mutation from useUpdateProduct because it's a separate
 * backend endpoint (PUT .../recipe vs PATCH .../{id}) with its own
 * validation shape (per-line errors, not per-field).
 */
export function useUpdateRecipe(
  id: number | string,
  options: { onSuccess?: (product: Product) => void } = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateRecipeInput) => updateProductRecipe(id, input),
    onSuccess: (product) => {
      toast.success("Recipe updated", { description: product.name });
      void queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      void queryClient.invalidateQueries({ queryKey: productQueryKey(id) });
      options.onSuccess?.(product);
    },
  });
}
