import { useEffect, useRef, useState } from "react";

/**
 * Tracks how many of a scrollable list's direct children are currently
 * scrolled out of view BELOW the container — used to show a "N more
 * below" affordance with an accurate count, not a guess based on item
 * count (an order with three items and long add-on lists can overflow
 * the same as one with seven bare items, and the reverse, so "more than N
 * items" is the wrong signal to build this on).
 *
 * Built on IntersectionObserver against the scroll container itself as
 * the root — the right tool for "is this element visible within its
 * scroll container," and it naturally re-fires on scroll, resize, and
 * content changes without separate listeners for each.
 *
 * Deliberately NOT "any non-intersecting item": scrolled to the bottom,
 * the FIRST item leaves the viewport from the top just as the last one
 * becomes visible — counting that as "more below" would keep the
 * affordance showing after the list is fully scrolled, pointing at
 * nothing. Each entry's own boundingClientRect vs. the root's bounds
 * decides which side an item left from.
 */
export function useHiddenBelowCount(itemCount: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [hiddenBelowCount, setHiddenBelowCount] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // hiddenBelow: an item counts once it has left the visible area
    // downward — its top edge at or past the root's bottom edge. An item
    // only partially clipped (still starting inside the visible area) is
    // still "there" for a barista scanning top-to-bottom, so it isn't
    // counted until it's fully past the fold.
    const hiddenBelow = new Map<Element, boolean>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const isBelow = !entry.isIntersecting && entry.rootBounds !== null
            ? entry.boundingClientRect.top >= entry.rootBounds.bottom
            : false;
          hiddenBelow.set(entry.target, isBelow);
        }
        const hiddenCount = itemRefs.current.filter(
          (el) => el && hiddenBelow.get(el) === true,
        ).length;
        setHiddenBelowCount(hiddenCount);
      },
      { root: container, threshold: 1 },
    );

    for (const el of itemRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
    // itemCount: re-observe when this ticket's own item list changes shape
    // (its refs array is rebuilt), not on every render.
  }, [itemCount]);

  function setItemRef(index: number) {
    return (el: HTMLElement | null) => {
      itemRefs.current[index] = el;
    };
  }

  return { containerRef, setItemRef, hiddenBelowCount };
}
