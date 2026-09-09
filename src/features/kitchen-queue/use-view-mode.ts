import { useSearchParams } from "react-router-dom";

export type KitchenQueueView = "tickets" | "table";

const STORAGE_KEY = "gasa_kitchen_queue_view";
const DEFAULT_VIEW: KitchenQueueView = "tickets";

function isView(value: string | null): value is KitchenQueueView {
  return value === "tickets" || value === "table";
}

function readStoredView(): KitchenQueueView | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isView(value) ? value : null;
  } catch {
    return null;
  }
}

function persistView(view: KitchenQueueView): void {
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Storage unavailable (e.g. private browsing) — the choice still
    // applies for this load via the URL param.
  }
}

/**
 * Tickets vs. table. The URL query param (?view=) is the source of truth
 * for the CURRENT page load (so a shared/refreshed link restores exactly
 * what was showing), while localStorage remembers the choice ACROSS visits
 * — a tablet that always lands on /app/kitchen-queue with no query string
 * should still come up in whatever view it was left in, not reset to
 * tickets every time. Tickets is the documented default when neither the
 * URL nor storage has an opinion.
 */
export function useViewMode(): [KitchenQueueView, (view: KitchenQueueView) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlView = searchParams.get("view");

  const view = isView(urlView) ? urlView : (readStoredView() ?? DEFAULT_VIEW);

  function setView(next: KitchenQueueView) {
    persistView(next);
    const params = new URLSearchParams(searchParams);
    params.set("view", next);
    setSearchParams(params);
  }

  return [view, setView];
}
