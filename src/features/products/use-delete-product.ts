import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteProduct } from "./api";
import { ApiError } from "@/lib/api/client";
import type { Product } from "./types";

/**
 * Deletes a product and refreshes the catalog list (its recipe lines
 * cascade away server-side; the ingredients themselves are untouched —
 * see DeleteIngredientAction's docblock for the reverse rule). Errors are
 * toasted here rather than in the confirm dialog: by the time the request
 * fails the dialog has already closed, and there's no form to put a
 * message under. A 404 means someone else deleted it first — that's still
 * "gone", so the list refreshes the same way.
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (product: Product) => deleteProduct(product.id),
    onSuccess: (_data, product) => {
      toast.success("Product deleted", { description: product.name });
      void queryClient.invalidateQueries({ queryKey: ["products", "list"] });
    },
    onError: (error: unknown, product) => {
      if (error instanceof ApiError && error.status === 404) {
        toast.info("Product was already deleted", { description: product.name });
        void queryClient.invalidateQueries({ queryKey: ["products", "list"] });
        return;
      }
      toast.error("Couldn't delete product", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });
}
