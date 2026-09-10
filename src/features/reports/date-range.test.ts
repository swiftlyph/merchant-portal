import { describe, expect, it } from "vitest";
import {
  MAX_RANGE_DAYS,
  isRangeWithinLimit,
  rangeDayCount,
  resolvePreset,
} from "./date-range";

describe("resolvePreset", () => {
  const now = new Date(2026, 8, 10); // Sep 10, 2026 (Thursday), local time

  it("today", () => {
    expect(resolvePreset("today", now)).toEqual({ from: "2026-09-10", to: "2026-09-10" });
  });

  it("yesterday", () => {
    expect(resolvePreset("yesterday", now)).toEqual({ from: "2026-09-09", to: "2026-09-09" });
  });

  it("last 7 days — inclusive of today", () => {
    expect(resolvePreset("last-7-days", now)).toEqual({ from: "2026-09-04", to: "2026-09-10" });
  });

  it("this month", () => {
    expect(resolvePreset("this-month", now)).toEqual({ from: "2026-09-01", to: "2026-09-10" });
  });

  it("last month — the full calendar month", () => {
    expect(resolvePreset("last-month", now)).toEqual({ from: "2026-08-01", to: "2026-08-31" });
  });

  it("last month across a year boundary", () => {
    const jan = new Date(2026, 0, 15);
    expect(resolvePreset("last-month", jan)).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });
});

describe("rangeDayCount / isRangeWithinLimit", () => {
  it("counts a single day as 1", () => {
    expect(rangeDayCount("2026-09-10", "2026-09-10")).toBe(1);
  });

  it("counts an inclusive span correctly", () => {
    expect(rangeDayCount("2026-09-01", "2026-09-03")).toBe(3);
  });

  it("accepts a range at exactly the cap", () => {
    expect(rangeDayCount("2025-09-11", "2026-09-10")).toBeLessThanOrEqual(MAX_RANGE_DAYS + 1);
  });

  it("rejects a range beyond MAX_RANGE_DAYS", () => {
    expect(isRangeWithinLimit("2025-01-01", "2026-06-01")).toBe(false);
  });

  it("accepts a range within MAX_RANGE_DAYS", () => {
    expect(isRangeWithinLimit("2026-09-01", "2026-09-10")).toBe(true);
  });

  it("treats from > to as not within limit (mirrors the server's 422)", () => {
    expect(isRangeWithinLimit("2026-09-10", "2026-09-01")).toBe(false);
  });
});
