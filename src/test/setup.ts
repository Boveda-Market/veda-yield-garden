import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
}

// jsdom lacks element scrolling; components call it to keep chips in view.
if (typeof Element !== "undefined" && !Element.prototype.scrollTo) Element.prototype.scrollTo = function scrollTo() {};
