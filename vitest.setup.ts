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
