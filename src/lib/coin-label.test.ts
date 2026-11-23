import { describe, expect, it } from "vitest";
import { coinLabel } from "./coin-label";
import { CHAIN_POOLS } from "./solana-data";
import { VAULTS } from "./vaults";

describe("coinLabel", () => {
  it("shows Bitcoin as BTC whatever the market calls it", () => {
    for (const raw of ["CBBTC", "cbBTC", "$CBBTC", "WBTC", " cbbtc "]) {
      expect(coinLabel(raw, "BTC")).toBe("BTC");
    }
  });
  it("keeps every other vault's own name intact", () => {
    for (const v of CHAIN_POOLS) {
      if (v.id === "btc") continue;
      expect(coinLabel(v.symbol, v.symbol)).toBe(v.symbol);
    }
  });
  it("never invents a name: with no market symbol it falls back to the vault's pair name", () => {
    for (const v of VAULTS) {
      expect(coinLabel(null, v.pair.split("/")[0] ?? "")).toBe(v.pair.split("/")[0]);
    }
    expect(coinLabel("", "BTC")).toBe("BTC");
    expect(coinLabel(undefined)).toBe("");
  });
});
