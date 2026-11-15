import { describe, it, expect } from "vitest";
import { pickHeroVariant, HERO_VARIANTS } from "./hero-variants";
describe("pickHeroVariant", () => {
  it("has the original plus 4 new headlines", () => expect(HERO_VARIANTS.length).toBe(5));
  it("link ?v=3 forces variant 3", () => expect(pickHeroVariant("3", "1", 0)).toBe(3));
  it("keeps the saved variant for returning visitors", () => expect(pickHeroVariant(null, "2", 0.9)).toBe(2));
  it("ignores invalid values and picks randomly", () => expect(pickHeroVariant("9", "x", 0.99)).toBe(4));
});
