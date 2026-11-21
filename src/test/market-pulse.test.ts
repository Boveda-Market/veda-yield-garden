import { describe, it, expect } from "vitest";
import { marketPulsePost, VAULT_NARRATIVE } from "@/lib/market-pulse";

describe("weekly market pulse", () => {
  const base = { date: "24 nov", fng: { value: 12, label: "Extreme Fear" }, majors: [], vaults: [
    { id: "gta6", name: "Bóveda GTA6", volume24h: 600, apr: null },
    { id: "trump", name: "Bóveda TRUMP", volume24h: 3_000_000, apr: 40 },
    { id: "nueva", name: "Bóveda Nueva", volume24h: null, apr: null },
  ] };
  it("ties GTA6 and DCTY to the GTA VI story and TRUMP to politics", () => {
    expect(VAULT_NARRATIVE["gta6"]?.theme).toBe("Narrativa GTA VI");
    expect(VAULT_NARRATIVE["dcty"]?.theme).toBe("Narrativa GTA VI");
    expect(VAULT_NARRATIVE["trump"]?.theme).toBe("Narrativa política");
  });
  it("leads with the highest-volume vault and still lists future vaults", () => {
    const p = marketPulsePost(base);
    expect(p.indexOf("Bóveda TRUMP")).toBeLessThan(p.indexOf("Bóveda GTA6"));
    expect(p).toContain("Bóveda Nueva · Narrativa propia");
  });
});
