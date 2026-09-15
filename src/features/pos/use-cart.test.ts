import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeProduct } from "./test-fixtures";

const STORAGE_KEY = "gasa_pos_cart";

describe("cart store", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("starts empty with no discount when nothing is stored", async () => {
    const { useCartStore } = await import("./use-cart");
    expect(useCartStore.getState().lines).toEqual([]);
    expect(useCartStore.getState().discount_cents).toBe(0);
  });

  it("addProduct adds a new line for a product not already in the cart", async () => {
    const { useCartStore } = await import("./use-cart");
    useCartStore.getState().addProduct(makeProduct({ id: 1, name: "Espresso" }));

    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0]!).toMatchObject({ product_id: 1, product_name: "Espresso", quantity: 1 });
  });

  it("tapping the same product again increments quantity instead of adding a second line, when the last line has no add-ons", async () => {
    const { useCartStore } = await import("./use-cart");
    const product = makeProduct({ id: 1 });
    useCartStore.getState().addProduct(product);
    useCartStore.getState().addProduct(product);
    useCartStore.getState().addProduct(product);

    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0]!.quantity).toBe(3);
  });

  it("a product added after a DIFFERENT product gets its own line", async () => {
    const { useCartStore } = await import("./use-cart");
    useCartStore.getState().addProduct(makeProduct({ id: 1, name: "Espresso" }));
    useCartStore.getState().addProduct(makeProduct({ id: 2, name: "Latte" }));

    expect(useCartStore.getState().lines).toHaveLength(2);
  });

  it("re-tapping a product still merges into its existing bare line even after other products were tapped in between", async () => {
    const { useCartStore } = await import("./use-cart");
    const espresso = makeProduct({ id: 1, name: "Espresso" });
    const matcha = makeProduct({ id: 2, name: "Matcha Latte" });

    useCartStore.getState().addProduct(espresso);
    useCartStore.getState().addProduct(matcha);
    useCartStore.getState().addProduct(espresso);

    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(2);
    const espressoLine = lines.find((l) => l.product_id === 1);
    expect(espressoLine?.quantity).toBe(2);
  });

  it("a line with add-ons is never silently incremented by a later tap of the same product", async () => {
    const { useCartStore } = await import("./use-cart");
    const product = makeProduct({ id: 1 });
    useCartStore.getState().addProduct(product);
    const firstLineId = useCartStore.getState().lines[0]!.localId;
    useCartStore.getState().addAddOn(firstLineId, { name: "Extra shot", price_cents: 2500 });

    useCartStore.getState().addProduct(product);

    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(2);
    expect(lines[0]!.add_ons).toHaveLength(1);
    expect(lines[1]!.add_ons).toHaveLength(0);
  });

  it("setQuantity updates a line's quantity", async () => {
    const { useCartStore } = await import("./use-cart");
    useCartStore.getState().addProduct(makeProduct({ id: 1 }));
    const localId = useCartStore.getState().lines[0]!.localId;

    useCartStore.getState().setQuantity(localId, 5);

    expect(useCartStore.getState().lines[0]!.quantity).toBe(5);
  });

  it("setQuantity to 0 removes the line", async () => {
    const { useCartStore } = await import("./use-cart");
    useCartStore.getState().addProduct(makeProduct({ id: 1 }));
    const localId = useCartStore.getState().lines[0]!.localId;

    useCartStore.getState().setQuantity(localId, 0);

    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it("removeLine drops exactly that line", async () => {
    const { useCartStore } = await import("./use-cart");
    useCartStore.getState().addProduct(makeProduct({ id: 1 }));
    useCartStore.getState().addProduct(makeProduct({ id: 2 }));
    const toRemove = useCartStore.getState().lines[0]!.localId;

    useCartStore.getState().removeLine(toRemove);

    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0]!.product_id).toBe(2);
  });

  it("addAddOn appends an add-on to the right line, removeAddOn removes exactly that one", async () => {
    const { useCartStore } = await import("./use-cart");
    useCartStore.getState().addProduct(makeProduct({ id: 1 }));
    const localId = useCartStore.getState().lines[0]!.localId;

    useCartStore.getState().addAddOn(localId, { name: "Extra shot", price_cents: 2500 });
    useCartStore.getState().addAddOn(localId, { name: "Oat milk", price_cents: 1500 });

    let addOns = useCartStore.getState().lines[0]!.add_ons;
    expect(addOns).toHaveLength(2);

    useCartStore.getState().removeAddOn(localId, addOns[0]!.localId);

    addOns = useCartStore.getState().lines[0]!.add_ons;
    expect(addOns).toHaveLength(1);
    expect(addOns[0]!.name).toBe("Oat milk");
  });

  it("setDiscountCents clamps negative values to 0", async () => {
    const { useCartStore } = await import("./use-cart");
    useCartStore.getState().setDiscountCents(-500);
    expect(useCartStore.getState().discount_cents).toBe(0);
  });

  it("clear empties lines, discount, and storage", async () => {
    const { useCartStore } = await import("./use-cart");
    useCartStore.getState().addProduct(makeProduct({ id: 1 }));
    useCartStore.getState().setDiscountCents(1000);

    useCartStore.getState().clear();

    expect(useCartStore.getState().lines).toEqual([]);
    expect(useCartStore.getState().discount_cents).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("persists lines and discount across a remount (module reload)", async () => {
    const { useCartStore } = await import("./use-cart");
    useCartStore.getState().addProduct(makeProduct({ id: 1, name: "Espresso" }));
    useCartStore.getState().setDiscountCents(1000);

    vi.resetModules();
    const { useCartStore: reloaded } = await import("./use-cart");

    expect(reloaded.getState().lines).toHaveLength(1);
    expect(reloaded.getState().lines[0]!.product_name).toBe("Espresso");
    expect(reloaded.getState().discount_cents).toBe(1000);
  });

  it("ignores corrupted storage and starts empty rather than throwing", async () => {
    localStorage.setItem(STORAGE_KEY, "not valid json{{{");
    const { useCartStore } = await import("./use-cart");
    expect(useCartStore.getState().lines).toEqual([]);
  });
});
