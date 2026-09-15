import { create } from "zustand";
import type { CartAddOn, CartBeneficiary, CartBeneficiaryType, CartLine } from "./cart-types";
import type { MenuProduct } from "./types";

const STORAGE_KEY = "gasa_pos_cart";

/**
 * Hand-rolled localStorage persistence, following src/features/auth/store.ts
 * — this codebase doesn't use zustand/middleware's `persist`, so this
 * mirrors that same read/write-with-try/catch shape rather than
 * introducing a new pattern. A tablet reload mid-order must not lose a
 * customer's drinks, so the cart (lines + discount + beneficiaries)
 * persists across a refresh; it's explicitly cleared only on a successful
 * checkout or an explicit "New order".
 */
interface PersistedCart {
  lines: CartLine[];
  discount_cents: number;
  /** F13/P10. Defaults to [] on read for a cart stored before this phase — see isPersistedCart. */
  beneficiaries: CartBeneficiary[];
}

function isPersistedCart(value: unknown): value is Omit<PersistedCart, "beneficiaries"> & {
  beneficiaries?: unknown;
} {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<PersistedCart>;
  return Array.isArray(v.lines) && typeof v.discount_cents === "number";
}

function readStoredCart(): PersistedCart | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedCart(parsed)) return null;
    // A cart stored before F13/P10 has no `beneficiaries` key at all —
    // defaulted to [] here rather than in isPersistedCart's type guard,
    // so the guard itself stays a pure narrowing check.
    return { ...parsed, beneficiaries: Array.isArray(parsed.beneficiaries) ? parsed.beneficiaries : [] };
  } catch {
    return null;
  }
}

function persistCart(cart: PersistedCart): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage unavailable (e.g. private browsing) — cart still works for this load.
  }
}

function clearStoredCart(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export interface CartState {
  lines: CartLine[];
  discount_cents: number;
  /** F13/P10: the senior citizens/PWDs added to this order so far. Usually empty. */
  beneficiaries: CartBeneficiary[];
  /** Adds one unit of a product as a new line, or increments quantity if that exact product already has a bare (no add-ons) line anywhere in the cart (a fast "tap tap tap" repeat-order path, even with other products tapped in between); a product with add-ons always gets its own line so its add-ons aren't accidentally shared. A newly-merged/incremented line is never itself given a beneficiary assignment it didn't already have. */
  addProduct: (product: MenuProduct) => void;
  setQuantity: (localId: string, quantity: number) => void;
  removeLine: (localId: string) => void;
  addAddOn: (localId: string, addOn: Omit<CartAddOn, "localId">) => void;
  removeAddOn: (lineLocalId: string, addOnLocalId: string) => void;
  setDiscountCents: (discount_cents: number) => void;
  /** F13/P10: adds a new senior/PWD claim, unassigned to any line yet. Returns its localId so the caller can immediately let the cashier assign lines to it. */
  addBeneficiary: (beneficiary: Omit<CartBeneficiary, "localId">) => string;
  /** F13/P10: removing a beneficiary un-assigns every line that pointed at them — a line never survives pointing at a beneficiary that no longer exists. */
  removeBeneficiary: (localId: string) => void;
  updateBeneficiary: (localId: string, patch: { type?: CartBeneficiaryType; name?: string; id_number?: string }) => void;
  /** F13/P10: assigns (or, with null, un-assigns) a WHOLE line to one beneficiary — never a partial quantity (see CartLine.beneficiaryLocalId's docblock). */
  setLineBeneficiary: (lineLocalId: string, beneficiaryLocalId: string | null) => void;
  clear: () => void;
}

function persistAndSet(
  set: (partial: Partial<CartState>) => void,
  get: () => CartState,
  updater: (
    state: CartState,
  ) => Pick<CartState, "lines" | "discount_cents" | "beneficiaries">,
) {
  set(updater(get()));
  const { lines, discount_cents, beneficiaries } = get();
  persistCart({ lines, discount_cents, beneficiaries });
}

const initial = readStoredCart();

export const useCartStore = create<CartState>((set, get) => ({
  lines: initial?.lines ?? [],
  discount_cents: initial?.discount_cents ?? 0,
  beneficiaries: initial?.beneficiaries ?? [],

  addProduct: (product) =>
    persistAndSet(set, get, (state) => {
      const mergeable = state.lines.find(
        (line) => line.product_id === product.id && line.add_ons.length === 0,
      );
      if (mergeable) {
        return {
          lines: state.lines.map((line) =>
            line.localId === mergeable.localId ? { ...line, quantity: line.quantity + 1 } : line,
          ),
          discount_cents: state.discount_cents,
          beneficiaries: state.beneficiaries,
        };
      }

      const newLine: CartLine = {
        localId: crypto.randomUUID(),
        product_id: product.id,
        product_name: product.name,
        unit_price_cents: product.price_cents,
        currency: product.currency,
        quantity: 1,
        add_ons: [],
        beneficiaryLocalId: null,
      };
      return {
        lines: [...state.lines, newLine],
        discount_cents: state.discount_cents,
        beneficiaries: state.beneficiaries,
      };
    }),

  setQuantity: (localId, quantity) =>
    persistAndSet(set, get, (state) => ({
      lines:
        quantity <= 0
          ? state.lines.filter((line) => line.localId !== localId)
          : state.lines.map((line) => (line.localId === localId ? { ...line, quantity } : line)),
      discount_cents: state.discount_cents,
      beneficiaries: state.beneficiaries,
    })),

  removeLine: (localId) =>
    persistAndSet(set, get, (state) => ({
      lines: state.lines.filter((line) => line.localId !== localId),
      discount_cents: state.discount_cents,
      beneficiaries: state.beneficiaries,
    })),

  addAddOn: (localId, addOn) =>
    persistAndSet(set, get, (state) => ({
      lines: state.lines.map((line) =>
        line.localId === localId
          ? { ...line, add_ons: [...line.add_ons, { ...addOn, localId: crypto.randomUUID() }] }
          : line,
      ),
      discount_cents: state.discount_cents,
      beneficiaries: state.beneficiaries,
    })),

  removeAddOn: (lineLocalId, addOnLocalId) =>
    persistAndSet(set, get, (state) => ({
      lines: state.lines.map((line) =>
        line.localId === lineLocalId
          ? { ...line, add_ons: line.add_ons.filter((a) => a.localId !== addOnLocalId) }
          : line,
      ),
      discount_cents: state.discount_cents,
      beneficiaries: state.beneficiaries,
    })),

  setDiscountCents: (discount_cents) =>
    persistAndSet(set, get, (state) => ({
      lines: state.lines,
      discount_cents: Math.max(0, discount_cents),
      beneficiaries: state.beneficiaries,
    })),

  addBeneficiary: (beneficiary) => {
    const localId = crypto.randomUUID();
    persistAndSet(set, get, (state) => ({
      lines: state.lines,
      discount_cents: state.discount_cents,
      beneficiaries: [...state.beneficiaries, { ...beneficiary, localId }],
    }));
    return localId;
  },

  removeBeneficiary: (localId) =>
    persistAndSet(set, get, (state) => ({
      // Every line that pointed at this beneficiary is un-assigned, not
      // left dangling — a line must never reference a beneficiary that no
      // longer exists (see CartState.removeBeneficiary's docblock).
      lines: state.lines.map((line) =>
        line.beneficiaryLocalId === localId ? { ...line, beneficiaryLocalId: null } : line,
      ),
      discount_cents: state.discount_cents,
      beneficiaries: state.beneficiaries.filter((b) => b.localId !== localId),
    })),

  updateBeneficiary: (localId, patch) =>
    persistAndSet(set, get, (state) => ({
      lines: state.lines,
      discount_cents: state.discount_cents,
      beneficiaries: state.beneficiaries.map((b) =>
        b.localId === localId ? { ...b, ...patch } : b,
      ),
    })),

  setLineBeneficiary: (lineLocalId, beneficiaryLocalId) =>
    persistAndSet(set, get, (state) => ({
      lines: state.lines.map((line) =>
        line.localId === lineLocalId ? { ...line, beneficiaryLocalId } : line,
      ),
      discount_cents: state.discount_cents,
      beneficiaries: state.beneficiaries,
    })),

  clear: () => {
    clearStoredCart();
    set({ lines: [], discount_cents: 0, beneficiaries: [] });
  },
}));
