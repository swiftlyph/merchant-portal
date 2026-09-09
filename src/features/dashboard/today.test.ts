import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { todayDateParam } from "./today";

describe("todayDateParam", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats as YYYY-MM-DD", () => {
    vi.setSystemTime(new Date(2026, 8, 5, 14, 30)); // Sep 5, 2026, local time
    expect(todayDateParam()).toBe("2026-09-05");
  });

  it("pads single-digit months and days", () => {
    vi.setSystemTime(new Date(2026, 0, 3, 9, 0)); // Jan 3, 2026
    expect(todayDateParam()).toBe("2026-01-03");
  });

  it("uses LOCAL date parts, not a UTC-shifted one", () => {
    // 11:30 PM local on Sep 9 — a naive toISOString() call could report
    // Sep 10 depending on the runner's timezone offset. getFullYear/
    // getMonth/getDate are always local, so this must stay Sep 9.
    vi.setSystemTime(new Date(2026, 8, 9, 23, 30));
    expect(todayDateParam()).toBe("2026-09-09");
  });
});
