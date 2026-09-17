import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateProduct } from "./api";
import { productQueryKey } from "./use-product";
import type { Product, UpdateProductInput } from "./types";

/** Updates a product's own fields (name/category/price/status/description) and refreshes the list and its own detail query. Recipe edits go through useUpdateRecipe instead — a separate endpoint, separate mutation. */
export function useUpdateProduct(
  id: number | string,
  options: { onSuccess?: (product: Product) => void } = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProductInput) => updateProduct(id, input),
    onSuccess: (product) => {
      toast.success("Product updated", { description: product.name });
      void queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      void queryClient.invalidateQueries({ queryKey: productQueryKey(id) });
      options.onSuccess?.(product);
    },
  });
}
