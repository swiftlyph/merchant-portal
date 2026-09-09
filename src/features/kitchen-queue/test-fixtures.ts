import type { KitchenOrder, KitchenQueueResponse, KitchenQueueSummary } from "./types";

export function makeKitchenOrder(overrides: Partial<KitchenOrder> = {}): KitchenOrder {
  return {
    id: 1,
    order_number: "ORD-000001",
    created_at: "2026-09-09T02:15:00.000Z",
    waiting_seconds: 60,
    items: [
      {
        id: 1,
        product_name: "Iced Latte",
        quantity: 1,
        add_ons: [],
      },
    ],
    ...overrides,
  };
}

export function makeKitchenQueueResponse(
  overrides: Partial<KitchenQueueResponse> = {},
): KitchenQueueResponse {
  return {
    data: [makeKitchenOrder()],
    ...overrides,
  };
}

export function makeKitchenQueueSummary(
  overrides: Partial<KitchenQueueSummary> = {},
): KitchenQueueSummary {
  return {
    pending_count: 1,
    oldest_waiting_seconds: 60,
    ...overrides,
  };
}
