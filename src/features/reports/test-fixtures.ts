import { formatCents } from "@/lib/money";
import type {
  PaymentMethodBucket,
  SalesByDayResponse,
  SalesByDayRow,
  SalesSummary,
  TopItemRow,
  TopItemsResponse,
} from "./types";

function makeBucket(overrides: Partial<PaymentMethodBucket> = {}): PaymentMethodBucket {
  const amountCents = overrides.amount_cents ?? 0;
  return {
    count: 0,
    amount_cents: amountCents,
    amount_formatted: formatCents(amountCents),
    ...overrides,
  };
}

export function makeSalesSummary(overrides: Partial<SalesSummary> = {}): SalesSummary {
  const netCents = overrides.net_cents ?? 22500;
  const grossCents = overrides.gross_cents ?? 23000;
  const discountCents = overrides.discount_cents ?? 500;
  const averageOrderCents = overrides.average_order_cents ?? 7500;

  return {
    orders_count: 4,
    completed_count: 2,
    voided_count: 1,
    gross_cents: grossCents,
    gross_formatted: formatCents(grossCents),
    discount_cents: discountCents,
    discount_formatted: formatCents(discountCents),
    net_cents: netCents,
    net_formatted: formatCents(netCents),
    statutory_discount_cents: overrides.statutory_discount_cents ?? 0,
    statutory_discount_formatted: formatCents(overrides.statutory_discount_cents ?? 0),
    promo_discount_cents: overrides.promo_discount_cents ?? discountCents,
    promo_discount_formatted: formatCents(overrides.promo_discount_cents ?? discountCents),
    vatable_sales_cents: overrides.vatable_sales_cents ?? 0,
    vatable_sales_formatted: formatCents(overrides.vatable_sales_cents ?? 0),
    vat_cents: overrides.vat_cents ?? 0,
    vat_formatted: formatCents(overrides.vat_cents ?? 0),
    vat_exempt_sales_cents: overrides.vat_exempt_sales_cents ?? 0,
    vat_exempt_sales_formatted: formatCents(overrides.vat_exempt_sales_cents ?? 0),
    nonvat_sales_cents: overrides.nonvat_sales_cents ?? grossCents,
    nonvat_sales_formatted: formatCents(overrides.nonvat_sales_cents ?? grossCents),
    by_payment_method: {
      cash: makeBucket({ count: 1, amount_cents: 13000 }),
      gcash: makeBucket({ count: 1, amount_cents: 9500 }),
      split: makeBucket({ count: 1, amount_cents: 8000 }),
    },
    average_order_cents: averageOrderCents,
    average_order_formatted: formatCents(averageOrderCents),
    ...overrides,
  };
}

export function makeSalesByDayRow(overrides: Partial<SalesByDayRow> = {}): SalesByDayRow {
  const netCents = overrides.net_cents ?? 5000;
  return {
    date: "2026-09-09",
    orders_count: 1,
    net_cents: netCents,
    net_formatted: formatCents(netCents),
    ...overrides,
  };
}

export function makeSalesByDayResponse(
  overrides: Partial<SalesByDayResponse> = {},
): SalesByDayResponse {
  return {
    data: [makeSalesByDayRow()],
    ...overrides,
  };
}

export function makeTopItemRow(overrides: Partial<TopItemRow> = {}): TopItemRow {
  const netCents = overrides.net_cents ?? 75000;
  return {
    product_name: "Cafe Latte (16oz)",
    quantity_sold: 5,
    net_cents: netCents,
    net_formatted: formatCents(netCents),
    ...overrides,
  };
}

export function makeTopItemsResponse(overrides: Partial<TopItemsResponse> = {}): TopItemsResponse {
  return {
    data: [makeTopItemRow()],
    ...overrides,
  };
}
