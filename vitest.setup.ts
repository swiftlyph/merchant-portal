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
