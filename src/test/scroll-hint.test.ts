import { describe, it, expect } from "vitest";
import { showArrow, hasMoreBelow } from "@/lib/scroll-hint";
describe("scroll hint", () => {
  it("arrow only on the first 3 visits", () => { expect(showArrow(0)).toBe(true); expect(showArrow(2)).toBe(true); expect(showArrow(3)).toBe(false); });
  it("fade hides at the end of the page", () => { expect(hasMoreBelow(0, 800, 2000)).toBe(true); expect(hasMoreBelow(1200, 800, 2000)).toBe(false); });
});
