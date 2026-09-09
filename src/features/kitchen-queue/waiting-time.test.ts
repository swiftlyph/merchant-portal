import { describe, expect, it } from "vitest";
import { formatWaitingTime, staleness } from "./waiting-time";

describe("formatWaitingTime", () => {
  it("formats seconds under a minute as Ns", () => {
    expect(formatWaitingTime(45)).toBe("45s");
    expect(formatWaitingTime(0)).toBe("0s");
  });

  it("formats a minute or more as Nm Ns", () => {
    expect(formatWaitingTime(90)).toBe("1m 30s");
    expect(formatWaitingTime(754)).toBe("12m 34s");
  });

  it("clamps a negative input to zero", () => {
    expect(formatWaitingTime(-5)).toBe("0s");
  });
});

describe("staleness", () => {
  it("is normal under 5 minutes", () => {
    expect(staleness(0)).toBe("normal");
    expect(staleness(299)).toBe("normal");
  });

  it("is warning from 5 to under 10 minutes", () => {
    expect(staleness(300)).toBe("warning");
    expect(staleness(599)).toBe("warning");
  });

  it("is urgent at 10 minutes and beyond", () => {
    expect(staleness(600)).toBe("urgent");
    expect(staleness(6000)).toBe("urgent");
  });
});
