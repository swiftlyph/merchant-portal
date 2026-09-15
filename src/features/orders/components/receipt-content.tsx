import { VoidedBanner } from "./voided-banner";
import { PAYMENT_METHOD_LABEL, formatDateTime } from "../format";
import type { Receipt } from "../types";

/**
 * The receipt body shared by /app/orders/:id/receipt and the POS success
 * screen — same payload (Receipt), same rendering, so a cashier reprinting
 * from order detail later sees exactly what printed right after checkout.
 * `merchant.receipt_header`/`receipt_footer` are the LIVE profile values
 * from Settings, not a snapshot — see ReceiptMerchant's docblock.
 */
export function ReceiptContent({ receipt }: { receipt: Receipt }) {
  const { merchant, order } = receipt;
  const addressLine = [merchant.address_line1, merchant.address_line2, merchant.city]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-3">
      {order.voided && <VoidedBanner voidedAt={order.voided_at} />}

      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-sm font-bold">{merchant.name}</span>
        {merchant.legal_name && <span>{merchant.legal_name}</span>}
        {addressLine && <span>{addressLine}</span>}
        {merchant.postal_code && <span>{merchant.postal_code}</span>}
        {merchant.phone && <span>{merchant.phone}</span>}
        {merchant.tax_identifier && <span>TIN {merchant.tax_identifier}</span>}
        {merchant.receipt_header && (
          <p className="mt-1 border-t border-dashed border-black/40 pt-1">
            {merchant.receipt_header}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-dashed border-black/40 pt-2">
        <div className="flex justify-between">
          <span>{order.order_number}</span>
          <span>{formatDateTime(order.created_at)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Cashier</span>
          <span>{order.cashier_name}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-dashed border-black/40 pt-2">
        {order.lines.map((line, index) => (
          <div key={`${line.product_name}-${index}`} className="flex flex-col">
            <div className="flex justify-between">
              <span>
                {line.quantity}x {line.product_name}
              </span>
              <span>{line.line_total_formatted}</span>
            </div>
            <div className="pl-3 text-muted-foreground">@ {line.unit_price_formatted}</div>
            {line.add_ons.map((addOn, addOnIndex) => (
              <div
                key={`${addOn.name}-${addOnIndex}`}
                className="flex justify-between pl-3 text-muted-foreground"
              >
                <span>+ {addOn.name}</span>
                <span>{addOn.price_formatted}</span>
              </div>
            ))}
            {/* F13/P10: this line's own statutory discount — 0 on an ordinary line, so this only ever prints for a line assigned to a beneficiary. */}
            {line.discount_cents > 0 && (
              <div className="flex justify-between pl-3 text-muted-foreground">
                <span>Senior/PWD discount</span>
                <span>-{line.discount_formatted}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* F13/P10: usually absent — one row per person who claimed a senior/PWD discount on this order. */}
      {order.beneficiaries.length > 0 && (
        <div className="flex flex-col gap-0.5 border-t border-dashed border-black/40 pt-2">
          <div className="text-center font-bold">Senior/PWD discount</div>
          {order.beneficiaries.map((beneficiary, index) => (
            <div key={`${beneficiary.id_number}-${index}`} className="flex justify-between">
              <span>
                {beneficiary.name} ({beneficiary.type_label}, ID {beneficiary.id_number})
              </span>
              <span>-{beneficiary.discount_formatted}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-0.5 border-t border-dashed border-black/40 pt-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{order.subtotal_formatted}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount</span>
          <span>-{order.discount_formatted}</span>
        </div>
        {/* F13/P10: the two causes behind the Discount line above — shown only when either applies. */}
        {order.statutory_discount_cents > 0 && (
          <div className="flex justify-between pl-3 text-muted-foreground">
            <span>Senior/PWD</span>
            <span>-{order.statutory_discount_formatted}</span>
          </div>
        )}
        {order.promo_discount_cents > 0 && (
          <div className="flex justify-between pl-3 text-muted-foreground">
            <span>Promo</span>
            <span>-{order.promo_discount_formatted}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold">
          <span>Total</span>
          <span>{order.total_formatted}</span>
        </div>
      </div>

      {/*
        F13/P10: real legal terms (VAT, VATable, VAT-exempt) — this is the
        one place F12's plain-language convention doesn't apply, because
        these print on a tax document. A VAT-registered order shows the
        breakdown; every other order shows the Non-VAT note instead —
        never both, and never a zeroed VAT figure on a non-VAT sale (see
        ReceiptTax's docblock for why the two shapes are mutually
        exclusive on the wire).
      */}
      <div className="flex flex-col gap-0.5 border-t border-dashed border-black/40 pt-2">
        {order.tax.vat_registered ? (
          <>
            <div className="flex justify-between">
              <span>VATable sales</span>
              <span>{order.tax.vatable_sales_formatted}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT ({order.tax.vat_rate_bps / 100}%)</span>
              <span>{order.tax.vat_formatted}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT-exempt sales</span>
              <span>{order.tax.vat_exempt_sales_formatted}</span>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground">{order.tax.non_vat_note}</p>
        )}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-dashed border-black/40 pt-2">
        <div className="flex justify-between">
          <span>Payment</span>
          <span>{PAYMENT_METHOD_LABEL[order.payment_method]}</span>
        </div>
        {order.payment_method === "split" && (
          <>
            <div className="flex justify-between pl-3 text-muted-foreground">
              <span>Cash</span>
              <span>{order.cash_formatted ?? "—"}</span>
            </div>
            <div className="flex justify-between pl-3 text-muted-foreground">
              <span>GCash</span>
              <span>{order.gcash_formatted ?? "—"}</span>
            </div>
          </>
        )}
      </div>

      {merchant.receipt_footer && (
        <p className="border-t border-dashed border-black/40 pt-2 text-center">
          {merchant.receipt_footer}
        </p>
      )}

      {order.voided && <VoidedBanner voidedAt={order.voided_at} />}
    </div>
  );
}
