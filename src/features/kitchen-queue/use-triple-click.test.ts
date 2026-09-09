import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTripleClick } from "./use-triple-click";

describe("useTripleClick", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires onComplete on the third click, not before", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useTripleClick(onComplete));

    act(() => result.current.register());
    expect(onComplete).not.toHaveBeenCalled();
    expect(result.current.progress).toBe(1);

    act(() => result.current.register());
    expect(onComplete).not.toHaveBeenCalled();
    expect(result.current.progress).toBe(2);

    act(() => result.current.register());
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.progress).toBe(0);
  });

  it("resets the sequence after the timeout when it stalls", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useTripleClick(onComplete));

    act(() => result.current.register());
    expect(result.current.progress).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(result.current.progress).toBe(0);

    // Two more clicks after the reset must not combine with the stalled first one.
    act(() => result.current.register());
    act(() => result.current.register());
    expect(onComplete).not.toHaveBeenCalled();
    expect(result.current.progress).toBe(2);
  });

  it("reset() aborts an in-progress sequence immediately", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useTripleClick(onComplete));

    act(() => result.current.register());
    act(() => result.current.register());
    expect(result.current.progress).toBe(2);

    act(() => result.current.reset());
    expect(result.current.progress).toBe(0);

    act(() => result.current.register());
    expect(onComplete).not.toHaveBeenCalled();
    expect(result.current.progress).toBe(1);
  });
});
