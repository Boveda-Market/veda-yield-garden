import { describe, it, expect } from "vitest";
import { pickHeroVariant, HERO_VARIANTS, HERO_WEIGHTS, HERO_SLUGS, legacyHeroRedirect } from "./hero-variants";
const idx = (t?: string) => HERO_VARIANTS.findIndex((v) => v.theme === t);
const share = (i: number) => HERO_WEIGHTS[i] ?? 0;
describe("pickHeroVariant", () => {
  it("each version has its own address", () => { expect(HERO_SLUGS.length).toBe(HERO_VARIANTS.length); expect(HERO_SLUGS[idx("calm")]).toBe("sin-ansiedad"); expect(HERO_SLUGS[idx("bitcoin")]).toBe("bitcoin"); expect(HERO_SLUGS[idx("gta6")]).toBe("gta6"); expect(HERO_SLUGS[idx("smart")]).toBe("bovedas-inteligentes"); });
  it("keeps a saved Bitcoin version", () => expect(pickHeroVariant(null, String(idx("bitcoin")), 0.01)).toBe(idx("bitcoin")));
  it("old ?v= links move to the new address and keep ?ref=", () => { expect(legacyHeroRedirect("?v=1&ref=AB")).toBe("/gta6?ref=AB"); expect(legacyHeroRedirect("?v=4")).toBe("/sin-ansiedad"); expect(legacyHeroRedirect("?v=99")).toBe("/"); expect(legacyHeroRedirect("?ref=AB")).toBeNull(); });
  it("allocates 10% to compound and preserves existing relative shares", () => {
    expect(share(idx("compound"))).toBe(0.1);
    expect(share(idx("bitcoin"))).toBeCloseTo(0.27); expect(share(idx("trump"))).toBeCloseTo(0.18); expect(share(idx("smart"))).toBeCloseTo(0.18); expect(share(idx("gta6"))).toBeCloseTo(0.135);
    expect(share(idx("calm"))).toBeCloseTo(0.045); expect(share(idx("doble"))).toBeCloseTo(0.045); expect(share(0)).toBeCloseTo(0.045);
    expect(HERO_WEIGHTS.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it("gives compound its own address and supports saved visits", () => {
    expect(HERO_SLUGS[idx("compound")]).toBe("interes-compuesto");
    expect(pickHeroVariant(null, String(idx("compound")), 0)).toBe(idx("compound"));
  });
  it("forced link wins", () => expect(pickHeroVariant("4", "1", 0)).toBe(4));
  it("keeps the saved variant", () => expect(pickHeroVariant(null, "2", 0.1)).toBe(2));
  it("random draw follows the weights", () => { expect(pickHeroVariant(null, null, 0.01)).toBe(0); expect(pickHeroVariant(null, null, 0.1)).toBe(1); expect(pickHeroVariant(null, null, 0.3)).toBe(idx("trump")); expect(pickHeroVariant(null, null, 0.999)).toBe(idx("compound")); });
  it("ignores invalid values", () => expect(pickHeroVariant("99", "x", 0.999)).toBe(idx("compound")));
});
