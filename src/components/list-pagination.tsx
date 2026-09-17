import type { PageMeta } from "@/lib/api/pagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_PER_PAGE_OPTIONS = [15, 25, 50];

interface ListPaginationProps {
  meta: PageMeta;
  page: number;
  onPageChange: (page: number) => void;
  /**
   * Rows-per-page control, shown alongside the pager when provided. Omit
   * (as the orders/cash-drawer pagers do) to keep the plain prev/next
   * pager with no page-size choice.
   */
  perPage?: number;
  onPerPageChange?: (perPage: number) => void;
  /** Defaults to 15/25/50 — the products and ingredients lists' own default. */
  perPageOptions?: number[];
}

/**
 * Prev/next pager for server-paginated lists, with an optional rows-per-page
 * select. Renders nothing for a single page UNLESS a page-size control is
 * present — that control stays visible even on one page, so choosing a
 * smaller size can still split it into more.
 *
 * Same pager behavior as the orders list's inline one; extracted so the
 * products and ingredients lists share it.
 */
export function ListPagination({
  meta,
  page,
  onPageChange,
  perPage,
  onPerPageChange,
  perPageOptions = DEFAULT_PER_PAGE_OPTIONS,
}: ListPaginationProps) {
  const showPager = meta.last_page > 1;
  const showPerPage = onPerPageChange !== undefined;

  if (!showPager && !showPerPage) return null;

  const atFirst = page <= 1;
  const atLast = page >= meta.last_page;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {showPerPage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <label htmlFor="list-pagination-per-page">Rows per page</label>
          <Select
            value={String(perPage)}
            onValueChange={(value) => onPerPageChange(Number(value))}
          >
            <SelectTrigger id="list-pagination-per-page" size="sm" className="w-18">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {perPageOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showPager && (
        <div className="flex-1">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={atFirst}
                  className={atFirst ? "pointer-events-none opacity-50" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!atFirst) onPageChange(page - 1);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-2 text-sm text-muted-foreground">
                  Page {meta.current_page} of {meta.last_page}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-disabled={atLast}
                  className={atLast ? "pointer-events-none opacity-50" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!atLast) onPageChange(page + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
