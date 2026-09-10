import { describe, expect, it } from "vitest";
import { formatCentsAxisTick, tooltipAmountFor } from "./sales-by-day-format";
import { formatCents } from "@/lib/money";

describe("formatCentsAxisTick", () => {
  it("renders pesos for zero", () => {
    expect(formatCentsAxisTick(0)).toBe("₱0.00");
  });

  it("renders pesos, not raw cents, for a mid-size value", () => {
    expect(formatCentsAxisTick(280000)).toBe("₱2,800.00");
    expect(formatCentsAxisTick(280000)).not.toContain("280000");
  });

  it("renders pesos for a large seven-digit-cents value", () => {
    expect(formatCentsAxisTick(1234567)).toBe("₱12,345.67");
    expect(formatCentsAxisTick(1234567)).not.toContain("1234567");
  });
});

describe("tooltipAmountFor", () => {
  it("prefers the row's own formatted string", () => {
    expect(tooltipAmountFor({ net_cents: 280000, net_formatted: "₱2,800.00" })).toBe("₱2,800.00");
  });

  it("falls back to the axis formatter when net_formatted is missing", () => {
    expect(tooltipAmountFor({ net_cents: 280000, net_formatted: "" })).toBe(formatCents(280000));
  });
});
