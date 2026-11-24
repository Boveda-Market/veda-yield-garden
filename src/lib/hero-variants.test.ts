import { describe, it, expect } from "vitest";
import { pickHeroVariant, HERO_VARIANTS, HERO_WEIGHTS, HERO_SLUGS, legacyHeroRedirect } from "./hero-variants";
const idx = (t?: string) => HERO_VARIANTS.findIndex((v) => v.theme === t);
const share = (i: number) => HERO_WEIGHTS[i] ?? 0;
describe("pickHeroVariant", () => {
  it("each version has its own address", () => { expect(HERO_SLUGS.length).toBe(HERO_VARIANTS.length); expect(HERO_SLUGS[idx("calm")]).toBe("sin-ansiedad"); expect(HERO_SLUGS[idx("bitcoin")]).toBe("bitcoin"); expect(HERO_SLUGS[idx("gta6")]).toBe("gta6"); });
  it("Bitcoin version is separate: never in the random rotation", () => { expect(share(idx("bitcoin"))).toBe(0); expect(pickHeroVariant(null, String(idx("bitcoin")), 0.05)).toBe(0); });
  it("old ?v= links move to the new address and keep ?ref=", () => { expect(legacyHeroRedirect("?v=1&ref=AB")).toBe("/gta6?ref=AB"); expect(legacyHeroRedirect("?v=4")).toBe("/sin-ansiedad"); expect(legacyHeroRedirect("?v=99")).toBe("/"); expect(legacyHeroRedirect("?ref=AB")).toBeNull(); });
  it("shares: GTA6 30%, calm 25%, Trump 25%, original 10%, Doble 10%", () => {
    expect(share(idx("gta6"))).toBe(0.3); expect(share(idx("calm"))).toBe(0.25); expect(share(idx("trump"))).toBe(0.25);
    expect(share(0)).toBe(0.1); expect(share(idx("doble"))).toBe(0.1);
    expect(HERO_WEIGHTS.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it("forced link wins", () => expect(pickHeroVariant("4", "1", 0)).toBe(4));
  it("keeps the saved variant", () => expect(pickHeroVariant(null, "2", 0.1)).toBe(2));
  it("random draw follows the weights", () => { expect(pickHeroVariant(null, null, 0.05)).toBe(0); expect(pickHeroVariant(null, null, 0.15)).toBe(1); expect(pickHeroVariant(null, null, 0.999)).toBe(4); });
  it("ignores invalid values", () => expect(pickHeroVariant("99", "x", 0.999)).toBe(4));
});
