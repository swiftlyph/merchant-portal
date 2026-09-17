import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "./api";

export const categoriesQueryKey = ["catalog", "categories"] as const;

/**
 * The fixed category list with each one's product-ID prefix. It's server
 * config, so it's fetched once and kept for the session. Pass
 * `enabled: false` to defer the request until it's actually needed (the add
 * form only enables it while the dialog is open).
 */
export function useCategories(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: fetchCategories,
    staleTime: Infinity,
    enabled: options.enabled ?? true,
  });
}
