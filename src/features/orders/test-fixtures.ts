import type { Order, OrdersPage } from "./types";

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    order_number: "ORD-000001",
    status: "pending",
    payment_method: "cash",
    subtotal_cents: 15000,
    discount_cents: 0,
    total_cents: 15000,
    currency: "PHP",
    cash_cents: null,
    gcash_cents: null,
    created_by_user_id: 1,
    completed_at: null,
    voided_at: null,
    created_at: "2026-09-09T02:15:00.000Z",
    items: [
      {
        product_name: "Iced Latte",
        unit_price_cents: 15000,
        quantity: 1,
        line_total_cents: 15000,
        add_ons: [],
      },
    ],
    ...overrides,
  };
}

export function makeOrdersPage(overrides: Partial<OrdersPage> = {}): OrdersPage {
  return {
    data: [makeOrder()],
    links: { first: null, last: null, prev: null, next: null },
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
    ...overrides,
  };
}
