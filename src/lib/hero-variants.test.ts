import { describe, it, expect } from "vitest";
import { pickHeroVariant, HERO_VARIANTS, GTA6_HERO, GTA6_HEROES } from "./hero-variants";
const CALM = HERO_VARIANTS.findIndex((v) => v.theme === "calm");
describe("pickHeroVariant", () => {
  it("has the original, GTA6, Trump, Doble o Nada and the calm-hold variant", () => expect(HERO_VARIANTS.length).toBe(5));
  it("the calm-hold variant is reachable with ?v=4", () => { expect(CALM).toBe(4); expect(pickHeroVariant("4", "1", 0)).toBe(4); });
  it("link ?v=1 forces the GTA6 variant", () => expect(pickHeroVariant("1", "2", 0.9)).toBe(GTA6_HERO));
  it("keeps the saved variant for returning visitors", () => expect(pickHeroVariant(null, "2", 0.1)).toBe(2));
  it("40% of new visitors see GTA6", () => { expect(GTA6_HEROES).toEqual([1]); expect(pickHeroVariant(null, null, 0)).toBe(1); expect(pickHeroVariant(null, null, 0.39)).toBe(1); expect(pickHeroVariant(null, null, 0.4)).not.toBe(1); });
  it("the other 60% split evenly, calm hold included", () => { expect(pickHeroVariant(null, null, 0.4)).toBe(0); expect(pickHeroVariant(null, null, 0.99)).toBe(CALM); });
  it("ignores invalid values", () => expect(pickHeroVariant("99", "x", 0.99)).toBe(CALM));
});
