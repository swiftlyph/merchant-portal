/** A line's add-on: client-supplied name + price, since no add-on catalog exists yet. */
export interface CartAddOn {
  /** Local-only id (crypto.randomUUID) so a line can add/remove/edit individual add-ons before checkout. */
  localId: string;
  name: string;
  price_cents: number;
}

/**
 * One cart line = one product tapped from the menu, at whatever price_cents
 * the menu had at add-time (a display-only snapshot — the server re-looks-up
 * and re-snapshots at checkout, and its price always wins over this one).
 */
export interface CartLine {
  /** Local-only id (crypto.randomUUID) — stable across quantity/add-on edits, distinct from product_id so two lines could in principle exist for the same product (not currently offered by the UI, but nothing here assumes one line per product). */
  localId: string;
  product_id: number;
  product_name: string;
  /** Snapshot of the menu price at add-time, for display math only — never sent to the server. */
  unit_price_cents: number;
  currency: string;
  quantity: number;
  add_ons: CartAddOn[];
}
