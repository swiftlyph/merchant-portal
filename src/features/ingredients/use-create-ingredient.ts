import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createIngredient } from "./api";
import type { Ingredient } from "./types";

/** Creates an ingredient and refreshes the ingredients list. Error handling is the dialog's job, since it owns the form state. */
export function useCreateIngredient(options: { onSuccess?: (ingredient: Ingredient) => void } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createIngredient,
    onSuccess: (ingredient) => {
      toast.success("Ingredient added", { description: ingredient.name });
      void queryClient.invalidateQueries({ queryKey: ["ingredients", "list"] });
      options.onSuccess?.(ingredient);
    },
  });
}
