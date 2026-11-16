import { describe, it, expect } from "vitest";
import { pickHeroVariant, HERO_VARIANTS, GTA6_HERO, GTA6_HEROES } from "./hero-variants";
describe("pickHeroVariant", () => {
  it("has the original, 4 headlines and the GTA6 launch variant", () => expect(HERO_VARIANTS.length).toBe(16));
  it("link ?v=5 forces the GTA6 variant", () => expect(pickHeroVariant("5", "1", 0.9)).toBe(GTA6_HERO));
  it("link ?v=3 forces variant 3", () => expect(pickHeroVariant("3", "1", 0)).toBe(3));
  it("keeps the saved variant for returning visitors", () => expect(pickHeroVariant(null, "2", 0.1)).toBe(2));
  it("40% of new visitors see GTA6", () => { expect(GTA6_HEROES).toHaveLength(6); expect(GTA6_HEROES).toContain(pickHeroVariant(null, null, 0.39)); expect(pickHeroVariant(null, null, 0)).toBe(GTA6_HERO); expect(GTA6_HEROES).not.toContain(pickHeroVariant(null, null, 0.4)); });
  it("the other 60% split among the rest", () => { expect(pickHeroVariant(null, null, 0.4)).toBe(0); expect(pickHeroVariant(null, null, 0.99)).toBe(15); });
  it("ignores invalid values", () => expect(pickHeroVariant("99", "x", 0.99)).toBe(15));
});
