import { describe, it, expect } from "vitest";
import { pickHeroVariant, HERO_VARIANTS, HERO_WEIGHTS } from "./hero-variants";
const idx = (t?: string) => HERO_VARIANTS.findIndex((v) => v.theme === t);
const share = (i: number) => HERO_WEIGHTS[i] ?? 0;
describe("pickHeroVariant", () => {
  it("has 5 variants; calm hold is ?v=4", () => { expect(HERO_VARIANTS.length).toBe(5); expect(idx("calm")).toBe(4); });
  it("shares: GTA6 30%, calm 25%, Trump 25%, original 10%, Doble 10%", () => {
    expect(share(idx("gta6"))).toBe(0.3); expect(share(idx("calm"))).toBe(0.25); expect(share(idx("trump"))).toBe(0.25);
    expect(share(0)).toBe(0.1); expect(share(idx("doble"))).toBe(0.1);
    expect(HERO_WEIGHTS.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it("forced link wins", () => expect(pickHeroVariant("4", "1", 0)).toBe(4));
  it("keeps the saved variant", () => expect(pickHeroVariant(null, "2", 0.1)).toBe(2));
  it("random draw follows the weights", () => { expect(pickHeroVariant(null, null, 0.05)).toBe(0); expect(pickHeroVariant(null, null, 0.15)).toBe(1); expect(pickHeroVariant(null, null, 0.99)).toBe(4); });
  it("ignores invalid values", () => expect(pickHeroVariant("99", "x", 0.99)).toBe(4));
});
