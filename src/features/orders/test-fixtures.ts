import type { Order, OrdersPage, Receipt } from "./types";
import { formatCents } from "@/lib/money";

export function makeOrder(overrides: Partial<Order> = {}): Order {
  const currency = overrides.currency ?? "PHP";
  const subtotalCents = overrides.subtotal_cents ?? 15000;
  const discountCents = overrides.discount_cents ?? 0;
  const totalCents = overrides.total_cents ?? subtotalCents - discountCents;

  return {
    id: 1,
    order_number: "ORD-000001",
    status: "pending",
    currency,
    subtotal_cents: subtotalCents,
    subtotal_formatted: formatCents(subtotalCents, currency),
    discount_cents: discountCents,
    discount_formatted: formatCents(discountCents, currency),
    total_cents: totalCents,
    total_formatted: formatCents(totalCents, currency),
    payment_method: "cash",
    cash_cents: null,
    cash_formatted: null,
    gcash_cents: null,
    gcash_formatted: null,
    created_by_user_id: 1,
    voided_by_user_id: null,
    completed_at: null,
    voided_at: null,
    created_at: "2026-09-09T02:15:00.000Z",
    updated_at: "2026-09-09T02:15:00.000Z",
    items: [
      {
        id: 1,
        product_id: 1,
        product_name: "Iced Latte",
        unit_price_cents: 15000,
        unit_price_formatted: formatCents(15000, currency),
        quantity: 1,
        line_total_cents: 15000,
        line_total_formatted: formatCents(15000, currency),
        add_ons: [],
      },
    ],
    ...overrides,
  };
}

export function makeReceipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    merchant: {
      name: "Merchant One",
      legal_name: "Merchant One Food Corp.",
      address_line1: "123 Rizal St",
      address_line2: "Unit 4",
      city: "Cebu City",
      postal_code: "6000",
      phone: "+63 917 000 0000",
      tax_identifier: "123-456-789-000",
      receipt_header: "Thank you for visiting!",
      receipt_footer: "No refunds after 24 hours.",
      ...overrides.merchant,
    },
    order: {
      id: 1,
      order_number: "ORD-000001",
      status: "completed",
      created_at: "2026-09-10T06:12:00.000Z",
      voided: false,
      voided_at: null,
      cashier_name: "Alice Cashier",
      lines: [
        {
          product_name: "Iced Latte",
          quantity: 1,
          unit_price_cents: 15000,
          unit_price_formatted: formatCents(15000),
          line_total_cents: 15000,
          line_total_formatted: formatCents(15000),
          add_ons: [],
        },
      ],
      subtotal_cents: 15000,
      subtotal_formatted: formatCents(15000),
      discount_cents: 0,
      discount_formatted: formatCents(0),
      total_cents: 15000,
      total_formatted: formatCents(15000),
      payment_method: "cash",
      cash_cents: null,
      cash_formatted: null,
      gcash_cents: null,
      gcash_formatted: null,
      ...overrides.order,
    },
    generated_at: "2026-09-10T14:32:00.000Z",
    ...overrides,
  };
}

export function makeOrdersPage(overrides: Partial<OrdersPage> = {}): OrdersPage {
  return {
    data: [makeOrder()],
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      links: [],
      path: "/api/v1/merchant/orders",
      per_page: 25,
      to: 1,
      total: 1,
    },
    ...overrides,
  };
}
