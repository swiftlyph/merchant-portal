import { formatCents } from "@/lib/money";
import type { CartAddOn, CartBeneficiary, CartLine } from "./cart-types";
import type { MenuProduct, MenuResponse } from "./types";
import type { Order } from "@/features/orders/types";

export function makeProduct(overrides: Partial<MenuProduct> = {}): MenuProduct {
  const currency = overrides.currency ?? "PHP";
  const price_cents = overrides.price_cents ?? 9000;
  return {
    id: 1,
    name: "Espresso (Single)",
    price_cents,
    price_formatted: formatCents(price_cents, currency),
    currency,
    is_available: true,
    ...overrides,
  };
}

export function makeMenuResponse(overrides: Partial<MenuResponse> = {}): MenuResponse {
  return { data: [makeProduct()], ...overrides };
}

export function makeCartAddOn(overrides: Partial<CartAddOn> = {}): CartAddOn {
  return {
    localId: "addon-1",
    name: "Extra shot",
    price_cents: 2500,
    ...overrides,
  };
}

export function makeCartLine(overrides: Partial<CartLine> = {}): CartLine {
  return {
    localId: "line-1",
    product_id: 1,
    product_name: "Espresso (Single)",
    unit_price_cents: 9000,
    currency: "PHP",
    quantity: 1,
    add_ons: [],
    beneficiaryLocalId: null,
    ...overrides,
  };
}

export function makeCartBeneficiary(overrides: Partial<CartBeneficiary> = {}): CartBeneficiary {
  return {
    localId: "beneficiary-1",
    type: "senior",
    name: "Lola Remedios",
    id_number: "SC-2020-0001",
    ...overrides,
  };
}

/** Reuses the orders feature's Order fixture shape since checkout returns the same resource. */
export function makeCheckoutResponse(overrides: Partial<Order> = {}): Order {
  const currency = overrides.currency ?? "PHP";
  const subtotalCents = overrides.subtotal_cents ?? 9000;
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
        product_name: "Espresso (Single)",
        unit_price_cents: 9000,
        unit_price_formatted: formatCents(9000, currency),
        quantity: 1,
        line_total_cents: 9000,
        line_total_formatted: formatCents(9000, currency),
        beneficiary_id: null,
        discount_cents: 0,
        discount_formatted: formatCents(0, currency),
        payable_cents: 9000,
        payable_formatted: formatCents(9000, currency),
        add_ons: [],
      },
    ],
    tax: {
      vat_registered: false,
      vat_rate_bps: 0,
      vatable_sales_cents: 0,
      vatable_sales_formatted: formatCents(0, currency),
      vat_cents: 0,
      vat_formatted: formatCents(0, currency),
      vat_exempt_sales_cents: 0,
      vat_exempt_sales_formatted: formatCents(0, currency),
      nonvat_sales_cents: subtotalCents,
      nonvat_sales_formatted: formatCents(subtotalCents, currency),
      statutory_discount_cents: 0,
      statutory_discount_formatted: formatCents(0, currency),
      promo_discount_cents: discountCents,
      promo_discount_formatted: formatCents(discountCents, currency),
    },
    beneficiaries: [],
    ...overrides,
  };
}
