/**
 * Shapes verified against the real backend source (gasa-api), not a spec
 * doc: App\Domains\Orders\Http\Controllers\KitchenQueueController and
 * App\Domains\Orders\Http\Resources\KitchenOrderResource, cross-checked
 * against tests/Feature/Orders/KitchenQueueTest.php.
 *
 * Deliberately NO money anywhere in this module — KitchenOrderResource
 * omits it entirely (a barista doesn't need to know what a drink cost, and
 * this is the most-displayed, least-access-controlled screen in the shop).
 * Do not add a cents/formatted field here even if it would be convenient;
 * that field does not exist on the wire.
 */

/** Add-on names only (no price) — see KitchenOrderResource::line(). */
export type KitchenOrderAddOnName = string;

export interface KitchenOrderItem {
  id: number;
  product_name: string;
  quantity: number;
  add_ons: KitchenOrderAddOnName[];
}

export interface KitchenOrder {
  id: number;
  order_number: string;
  created_at: string;
  /**
   * Computed server-side from created_at, from one shared instant per
   * response — never derive this from created_at + the browser clock, and
   * never let a client-side timer run against created_at directly.
   */
  waiting_seconds: number;
  items: KitchenOrderItem[];
}

/** GET /merchant/kitchen-queue — unpaginated, capped at 200, oldest first. */
export interface KitchenQueueResponse {
  data: KitchenOrder[];
}

/**
 * GET /merchant/kitchen-queue/summary. oldest_waiting_seconds is null (not
 * 0) on an empty queue — "nothing waiting" and "waiting zero seconds" are
 * different facts. pending_count is UNCAPPED, unlike the queue list's 200
 * cap, so pending_count > data.length means the list view is truncated.
 */
export interface KitchenQueueSummary {
  pending_count: number;
  oldest_waiting_seconds: number | null;
}

export interface KitchenQueueFilters {
  /** Drops the today-only filter when true. Never widens the tenant scope. */
  all?: boolean;
}
