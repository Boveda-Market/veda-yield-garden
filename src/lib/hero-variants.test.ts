import { describe, it, expect } from "vitest";
import { pickHeroVariant, HERO_VARIANTS, HERO_WEIGHTS, HERO_SLUGS, legacyHeroRedirect } from "./hero-variants";
const idx = (t?: string) => HERO_VARIANTS.findIndex((v) => v.theme === t);
const share = (i: number) => HERO_WEIGHTS[i] ?? 0;
describe("pickHeroVariant", () => {
  it("each version has its own address", () => { expect(HERO_SLUGS.length).toBe(HERO_VARIANTS.length); expect(HERO_SLUGS[idx("calm")]).toBe("sin-ansiedad"); expect(HERO_SLUGS[idx("bitcoin")]).toBe("bitcoin"); expect(HERO_SLUGS[idx("gta6")]).toBe("gta6"); expect(HERO_SLUGS[idx("smart")]).toBe("bovedas-inteligentes"); });
  it("keeps a saved Bitcoin version", () => expect(pickHeroVariant(null, String(idx("bitcoin")), 0.01)).toBe(idx("bitcoin")));
  it("old ?v= links move to the new address and keep ?ref=", () => { expect(legacyHeroRedirect("?v=1&ref=AB")).toBe("/gta6?ref=AB"); expect(legacyHeroRedirect("?v=4")).toBe("/sin-ansiedad"); expect(legacyHeroRedirect("?v=99")).toBe("/"); expect(legacyHeroRedirect("?ref=AB")).toBeNull(); });
  it("rotates only Bitcoin and Trump equally", () => {
    expect(share(idx("bitcoin"))).toBe(0.5);
    expect(share(idx("trump"))).toBe(0.5);
    HERO_VARIANTS.forEach((variant, i) => {
      if (variant.theme !== "bitcoin" && variant.theme !== "trump") expect(share(i)).toBe(0);
    });
    expect(HERO_WEIGHTS.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it("preserves archived addresses but ignores saved inactive campaigns", () => {
    expect(HERO_SLUGS[idx("compound")]).toBe("interes-compuesto");
    HERO_VARIANTS.forEach((variant, i) => {
      if (variant.theme !== "bitcoin" && variant.theme !== "trump") {
        expect(pickHeroVariant(null, String(i), 0.75)).toBe(idx("bitcoin"));
      }
    });
  });
  it("forced link wins", () => expect(pickHeroVariant("4", "1", 0)).toBe(4));
  it("keeps the saved variant", () => expect(pickHeroVariant(null, "2", 0.1)).toBe(2));
  it("random draw follows the weights", () => { expect(pickHeroVariant(null, null, 0)).toBe(idx("trump")); expect(pickHeroVariant(null, null, 0.499)).toBe(idx("trump")); expect(pickHeroVariant(null, null, 0.5)).toBe(idx("bitcoin")); expect(pickHeroVariant(null, null, 0.999)).toBe(idx("bitcoin")); expect(pickHeroVariant(null, null, 1)).toBe(idx("bitcoin")); });
  it("ignores invalid values", () => expect(pickHeroVariant("99", "x", 0.999)).toBe(idx("bitcoin")));
});
