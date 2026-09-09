import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { useHiddenBelowCount } from "./use-overflow-affordance";

const ROOT_BOUNDS = { top: 0, bottom: 100, left: 0, right: 100 } as DOMRectReadOnly;

type Position = "visible" | "above" | "below";

function rectFor(position: Position): DOMRectReadOnly {
  // A 20px-tall item, placed fully inside, fully above, or fully below the
  // 100px-tall root's visible bounds.
  if (position === "visible") return { top: 40, bottom: 60 } as DOMRectReadOnly;
  if (position === "above") return { top: -30, bottom: -10 } as DOMRectReadOnly;
  return { top: 110, bottom: 130 } as DOMRectReadOnly;
}

/**
 * jsdom has no real layout engine, so IntersectionObserver can't actually
 * decide visibility from geometry — this fakes the observer itself,
 * capturing the callback so the test can fire it manually with contrived
 * entries carrying real boundingClientRect/rootBounds shapes, the same
 * way the browser would report them after a real scroll/resize. Position
 * (not just a bare isIntersecting boolean) matters here: the hook has to
 * tell an item that left from the TOP apart from one that left from the
 * BOTTOM, and only a bare boolean can't express that distinction.
 */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observed: Element[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observed.push(el);
  }

  unobserve(el: Element) {
    this.observed = this.observed.filter((o) => o !== el);
  }

  disconnect() {
    this.observed = [];
  }

  takeRecords() {
    return [];
  }

  /** Test helper: report each observed element's position. */
  fire(positions: Map<Element, Position>) {
    const entries = this.observed.map((target) => {
      const position = positions.get(target) ?? "visible";
      return {
        target,
        isIntersecting: position === "visible",
        boundingClientRect: rectFor(position),
        rootBounds: ROOT_BOUNDS,
      } as IntersectionObserverEntry;
    });
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

function ThreeItemList({ onCount }: { onCount: (count: number) => void }) {
  const { containerRef, setItemRef, hiddenBelowCount } = useHiddenBelowCount(3);
  onCount(hiddenBelowCount);

  return (
    <div ref={containerRef}>
      <div ref={setItemRef(0)}>Item 0</div>
      <div ref={setItemRef(1)}>Item 1</div>
      <div ref={setItemRef(2)}>Item 2</div>
    </div>
  );
}

describe("useHiddenBelowCount", () => {
  const originalIO = window.IntersectionObserver;

  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    window.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    window.IntersectionObserver = originalIO;
  });

  it("starts at zero before any intersection report arrives", () => {
    const counts: number[] = [];
    render(<ThreeItemList onCount={(c) => counts.push(c)} />);

    expect(counts.at(-1)).toBe(0);
  });

  it("counts items positioned below the visible area as hidden", () => {
    const counts: number[] = [];
    render(<ThreeItemList onCount={(c) => counts.push(c)} />);

    const observer = FakeIntersectionObserver.instances[0]!;
    const [item0, item1, item2] = observer.observed;

    act(() =>
      observer.fire(new Map([[item0!, "visible"], [item1!, "visible"], [item2!, "visible"]])),
    );
    expect(counts.at(-1)).toBe(0);

    // The last item scrolls out below.
    act(() =>
      observer.fire(new Map([[item0!, "visible"], [item1!, "visible"], [item2!, "below"]])),
    );
    expect(counts.at(-1)).toBe(1);

    // Two items now below.
    act(() =>
      observer.fire(new Map([[item0!, "visible"], [item1!, "below"], [item2!, "below"]])),
    );
    expect(counts.at(-1)).toBe(2);
  });

  it("does NOT count an item that left from the top as hidden below", () => {
    // Regression test: scrolled to the very bottom of a list, the FIRST
    // item leaves the viewport upward just as the last one settles into
    // view. That must read as "nothing more below," not still show a
    // stale "+1 more" pointing at nothing — this is exactly what a
    // naive "any non-intersecting item" count gets wrong.
    const counts: number[] = [];
    render(<ThreeItemList onCount={(c) => counts.push(c)} />);

    const observer = FakeIntersectionObserver.instances[0]!;
    const [item0, item1, item2] = observer.observed;

    act(() =>
      observer.fire(new Map([[item0!, "above"], [item1!, "visible"], [item2!, "visible"]])),
    );

    expect(counts.at(-1)).toBe(0);
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(<ThreeItemList onCount={() => {}} />);
    const observer = FakeIntersectionObserver.instances[0]!;
    const disconnectSpy = vi.spyOn(observer, "disconnect");

    unmount();

    expect(disconnectSpy).toHaveBeenCalledOnce();
  });
});
