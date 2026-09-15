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
  /**
   * F13/P10: which CartBeneficiary (by its localId) this line's WHOLE
   * quantity belongs to, if any — null for an ordinary line. Whole-line
   * only, never a per-unit split: the backend's own beneficiary
   * assignment is per line, not per unit, and there is no UI for
   * "2 of these 3 lattes are the senior's" (see CartBeneficiary's
   * docblock and the F13 spec: quantity splits are not required).
   */
  beneficiaryLocalId: string | null;
}

export type CartBeneficiaryType = "senior" | "pwd";

/**
 * F13/P10: a senior/PWD claim added to the cart, before checkout. Purely
 * client-side state — becomes a `CheckoutBeneficiary` (see pos/types.ts)
 * only at the moment a request is built, and the line-level
 * `beneficiaryLocalId` above is resolved to a request-array INDEX then,
 * never stored as one here (an index would silently point at the wrong
 * person the moment a beneficiary earlier in the list is removed).
 */
export interface CartBeneficiary {
  /** Local-only id (crypto.randomUUID) — stable identity independent of the beneficiary's position in the list, which is what lets a line's assignment survive another beneficiary being added/removed anywhere in the cart. */
  localId: string;
  type: CartBeneficiaryType;
  name: string;
  id_number: string;
}
