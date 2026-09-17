/**
 * Laravel's standard LengthAwarePaginator envelope, shared by every
 * paginated `index` endpoint (see gasa-api README § Response shapes: a
 * resource collection with pagination always wraps as { data, links, meta }
 * regardless of withoutWrapping()).
 *
 * The orders feature predates this file and carries its own copy of these
 * shapes in features/orders/types.ts; new features import from here.
 */

export interface PageLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

/** A page-number link in meta.links, e.g. { url, label: "2", active: false }. */
export interface PageMetaLink {
  url: string | null;
  label: string;
  active: boolean;
}

export interface PageMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  links: PageMetaLink[];
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  links: PageLinks;
  meta: PageMeta;
}

/**
 * Defensive normalizer for a paginated payload: a missing or malformed
 * envelope degrades to an empty single page instead of crashing a render.
 * `normalizeItem` is applied to each row so feature parsers stay additive-
 * tolerant the same way the orders parsers are.
 */
export function normalizePage<TRaw, T>(
  raw: Partial<Paginated<TRaw>> | null | undefined,
  normalizeItem: (item: TRaw) => T,
): Paginated<T> {
  return {
    data: Array.isArray(raw?.data) ? raw.data.map(normalizeItem) : [],
    links: {
      first: raw?.links?.first ?? null,
      last: raw?.links?.last ?? null,
      prev: raw?.links?.prev ?? null,
      next: raw?.links?.next ?? null,
    },
    meta: {
      current_page: raw?.meta?.current_page ?? 1,
      from: raw?.meta?.from ?? null,
      last_page: raw?.meta?.last_page ?? 1,
      links: Array.isArray(raw?.meta?.links) ? raw.meta.links : [],
      path: raw?.meta?.path ?? "",
      per_page: raw?.meta?.per_page ?? 0,
      to: raw?.meta?.to ?? null,
      total: raw?.meta?.total ?? 0,
    },
  };
}

/** Builds "?a=1&b=2" from a filters object, skipping empty/undefined values. */
export function buildQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
