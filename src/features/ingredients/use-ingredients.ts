import { useQuery } from "@tanstack/react-query";
import { fetchIngredients } from "./api";
import type { IngredientsFilters } from "./types";

export const ingredientsQueryKey = (filters: IngredientsFilters) =>
  ["ingredients", "list", filters] as const;

/** Stock levels for /app/inventory, filtered by stock status and server-paginated. */
export function useIngredients(filters: IngredientsFilters) {
  return useQuery({
    queryKey: ingredientsQueryKey(filters),
    queryFn: () => fetchIngredients(filters),
    placeholderData: (previousData) => previousData,
  });
}
