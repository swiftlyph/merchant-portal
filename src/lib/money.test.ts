import { describe, expect, it } from "vitest";
import { formatCents, parseAmountToCents } from "./money";

describe("formatCents", () => {
  it("formats integer cents as PHP currency", () => {
    expect(formatCents(15000)).toBe("₱150.00");
  });

  it("formats zero", () => {
    expect(formatCents(0)).toBe("₱0.00");
  });

  it("formats a value with cents that isn't a round number", () => {
    expect(formatCents(14750)).toBe("₱147.50");
  });

  it("never divides then re-multiplies through float display formatting error-prone paths", () => {
    // A classic float trap: 1 (dollar) formatted from 100 cents via /100 is
    // fine, but values like 29 cents (0.29) or 1 cent are where naive
    // cents/100 + toFixed can visibly drift on some runtimes/inputs.
    expect(formatCents(1)).toBe("₱0.01");
    expect(formatCents(29)).toBe("₱0.29");
  });

  it("supports a different currency code", () => {
    expect(formatCents(15000, "USD")).toBe("$150.00");
  });
});

describe("parseAmountToCents", () => {
  it("parses whole and fractional amounts to integer cents", () => {
    expect(parseAmountToCents("150")).toBe(15000);
    expect(parseAmountToCents("150.5")).toBe(15050);
    expect(parseAmountToCents("150.50")).toBe(15050);
    expect(parseAmountToCents("0.29")).toBe(29);
    expect(parseAmountToCents("0")).toBe(0);
  });

  it("tolerates a currency symbol, thousands separators and whitespace", () => {
    expect(parseAmountToCents("₱1,250.00")).toBe(125000);
    expect(parseAmountToCents(" $ 85 ")).toBe(8500);
  });

  it("rejects negatives, more than two decimals, and non-numeric input", () => {
    expect(parseAmountToCents("-5")).toBeNull();
    expect(parseAmountToCents("1.234")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents(".5")).toBeNull();
  });
});
