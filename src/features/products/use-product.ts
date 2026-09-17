import { useQuery } from "@tanstack/react-query";
import { fetchProduct } from "./api";
import { ApiError } from "@/lib/api/client";
import type { Product } from "./types";

export const productQueryKey = (id: number | string) => ["products", "detail", String(id)] as const;

/**
 * Single product for the view dialog. Seeded with the list row it was
 * opened from so the dialog paints instantly, then refetched from
 * /merchant/products/{id} so what's shown is current (e.g. stock edited on
 * another device). A 404 — deleted elsewhere — is not retried; the dialog
 * shows a notice over the stale row data instead of a spinner forever.
 */
export function useProduct(initial: Product, options: { enabled: boolean }) {
  return useQuery({
    queryKey: productQueryKey(initial.id),
    queryFn: () => fetchProduct(initial.id),
    initialData: initial,
    // initialData counts as stale immediately, so the refetch fires on open.
    staleTime: 0,
    enabled: options.enabled,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 1;
    },
  });
}
