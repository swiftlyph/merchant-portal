import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createProduct } from "./api";
import type { Product } from "./types";

/**
 * Creates a product and refreshes the catalog list. A new product has no
 * recipe yet (attached afterward, once it exists — see
 * useUpdateRecipe), so there's nothing ingredient-related to invalidate
 * here. Error handling (field errors vs. form alert) is the dialog's job,
 * since it owns the form state.
 */
export function useCreateProduct(options: { onSuccess?: (product: Product) => void } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: (product) => {
      toast.success("Product added", { description: product.name });
      void queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      options.onSuccess?.(product);
    },
  });
}
