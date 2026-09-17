import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "./api";
import type { ProductsFilters } from "./types";

export const productsQueryKey = (filters: ProductsFilters) =>
  ["products", "list", filters] as const;

/** Product catalog for /app/products, filtered by status/category and server-paginated. */
export function useProducts(filters: ProductsFilters) {
  return useQuery({
    queryKey: productsQueryKey(filters),
    queryFn: () => fetchProducts(filters),
    placeholderData: (previousData) => previousData,
  });
}
