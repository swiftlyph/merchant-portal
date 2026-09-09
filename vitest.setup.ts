import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement matchMedia — ThemeToggle (rendered on nearly every
// page) reads it to pick a default theme, so every test needs this stub.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// jsdom doesn't implement pointer capture — Radix's Select (and other
// pointer-driven primitives) call these on the trigger element during
// open/close, so any test that interacts with a Select needs this stub.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

// jsdom doesn't implement scrollIntoView either — Radix's Select scrolls the
// highlighted item into view on open/navigate.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom doesn't implement IntersectionObserver — the kitchen ticket's
// "N more below" affordance (useHiddenBelowCount) constructs one on mount.
// A no-op stub is enough for tests that don't assert on the affordance
// itself: it never fires, so hiddenBelowCount stays at its harmless
// default of 0 rather than throwing and failing every test that renders
// a TicketCard.
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}
