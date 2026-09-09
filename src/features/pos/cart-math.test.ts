import { describe, expect, it } from "vitest";
import { itemCount, lineTotalCents, splitRemainderCents, subtotalCents, totalCents } from "./cart-math";
import { makeCartAddOn, makeCartLine } from "./test-fixtures";

describe("lineTotalCents", () => {
  it("is unit price times quantity with no add-ons", () => {
    const line = makeCartLine({ unit_price_cents: 9000, quantity: 3 });
    expect(lineTotalCents(line)).toBe(27000);
  });

  it("adds add-on prices before multiplying by quantity (each unit gets the add-ons)", () => {
    const line = makeCartLine({
      unit_price_cents: 14000,
      quantity: 2,
      add_ons: [makeCartAddOn({ price_cents: 2500 }), makeCartAddOn({ localId: "addon-2", price_cents: 1500 })],
    });
    // (14000 + 2500 + 1500) * 2 = 36000
    expect(lineTotalCents(line)).toBe(36000);
  });

  it("never produces a float — integer cents only", () => {
    const line = makeCartLine({ unit_price_cents: 9999, quantity: 3 });
    expect(Number.isInteger(lineTotalCents(line))).toBe(true);
  });
});

describe("subtotalCents", () => {
  it("sums every line's total", () => {
    const lines = [
      makeCartLine({ localId: "a", unit_price_cents: 9000, quantity: 1 }),
      makeCartLine({ localId: "b", unit_price_cents: 14000, quantity: 2 }),
    ];
    expect(subtotalCents(lines)).toBe(9000 + 14000 * 2);
  });

  it("is 0 for an empty cart", () => {
    expect(subtotalCents([])).toBe(0);
  });
});

describe("totalCents", () => {
  it("subtracts the discount from the subtotal", () => {
    const lines = [makeCartLine({ unit_price_cents: 10000, quantity: 1 })];
    expect(totalCents(lines, 2000)).toBe(8000);
  });

  it("never goes negative even if the discount exceeds the subtotal", () => {
    const lines = [makeCartLine({ unit_price_cents: 10000, quantity: 1 })];
    expect(totalCents(lines, 999999)).toBe(0);
  });
});

describe("itemCount", () => {
  it("sums quantities across lines", () => {
    const lines = [
      makeCartLine({ localId: "a", quantity: 2 }),
      makeCartLine({ localId: "b", quantity: 3 }),
    ];
    expect(itemCount(lines)).toBe(5);
  });
});

describe("splitRemainderCents", () => {
  it("is 0 when cash + gcash exactly equal the total", () => {
    expect(splitRemainderCents(9000, 4500, 4500)).toBe(0);
  });

  it("is positive when short of the total", () => {
    expect(splitRemainderCents(9000, 5000, 3000)).toBe(1000);
  });

  it("is negative when over the total", () => {
    expect(splitRemainderCents(9000, 5000, 5000)).toBe(-1000);
  });
});
