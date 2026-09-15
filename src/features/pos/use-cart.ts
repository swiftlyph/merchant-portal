import { create } from "zustand";
import type { CartAddOn, CartLine } from "./cart-types";
import type { MenuProduct } from "./types";

const STORAGE_KEY = "gasa_pos_cart";

/**
 * Hand-rolled localStorage persistence, following src/features/auth/store.ts
 * — this codebase doesn't use zustand/middleware's `persist`, so this
 * mirrors that same read/write-with-try/catch shape rather than
 * introducing a new pattern. A tablet reload mid-order must not lose a
 * customer's drinks, so the cart (lines + discount) persists across a
 * refresh; it's explicitly cleared only on a successful checkout or an
 * explicit "New order".
 */
interface PersistedCart {
  lines: CartLine[];
  discount_cents: number;
}

function isPersistedCart(value: unknown): value is PersistedCart {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<PersistedCart>;
  return Array.isArray(v.lines) && typeof v.discount_cents === "number";
}

function readStoredCart(): PersistedCart | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPersistedCart(parsed) ? parsed : null;
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
  /** Adds one unit of a product as a new line, or increments quantity if that exact product already has a bare (no add-ons) line anywhere in the cart (a fast "tap tap tap" repeat-order path, even with other products tapped in between); a product with add-ons always gets its own line so its add-ons aren't accidentally shared. */
  addProduct: (product: MenuProduct) => void;
  setQuantity: (localId: string, quantity: number) => void;
  removeLine: (localId: string) => void;
  addAddOn: (localId: string, addOn: Omit<CartAddOn, "localId">) => void;
  removeAddOn: (lineLocalId: string, addOnLocalId: string) => void;
  setDiscountCents: (discount_cents: number) => void;
  clear: () => void;
}

function persistAndSet(
  set: (partial: Partial<CartState>) => void,
  get: () => CartState,
  updater: (state: CartState) => Pick<CartState, "lines" | "discount_cents">,
) {
  set(updater(get()));
  const { lines, discount_cents } = get();
  persistCart({ lines, discount_cents });
}

const initial = readStoredCart();

export const useCartStore = create<CartState>((set, get) => ({
  lines: initial?.lines ?? [],
  discount_cents: initial?.discount_cents ?? 0,

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
      };
      return { lines: [...state.lines, newLine], discount_cents: state.discount_cents };
    }),

  setQuantity: (localId, quantity) =>
    persistAndSet(set, get, (state) => ({
      lines:
        quantity <= 0
          ? state.lines.filter((line) => line.localId !== localId)
          : state.lines.map((line) => (line.localId === localId ? { ...line, quantity } : line)),
      discount_cents: state.discount_cents,
    })),

  removeLine: (localId) =>
    persistAndSet(set, get, (state) => ({
      lines: state.lines.filter((line) => line.localId !== localId),
      discount_cents: state.discount_cents,
    })),

  addAddOn: (localId, addOn) =>
    persistAndSet(set, get, (state) => ({
      lines: state.lines.map((line) =>
        line.localId === localId
          ? { ...line, add_ons: [...line.add_ons, { ...addOn, localId: crypto.randomUUID() }] }
          : line,
      ),
      discount_cents: state.discount_cents,
    })),

  removeAddOn: (lineLocalId, addOnLocalId) =>
    persistAndSet(set, get, (state) => ({
      lines: state.lines.map((line) =>
        line.localId === lineLocalId
          ? { ...line, add_ons: line.add_ons.filter((a) => a.localId !== addOnLocalId) }
          : line,
      ),
      discount_cents: state.discount_cents,
    })),

  setDiscountCents: (discount_cents) =>
    persistAndSet(set, get, (state) => ({
      lines: state.lines,
      discount_cents: Math.max(0, discount_cents),
    })),

  clear: () => {
    clearStoredCart();
    set({ lines: [], discount_cents: 0 });
  },
}));
