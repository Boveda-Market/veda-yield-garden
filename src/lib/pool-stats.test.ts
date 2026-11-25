import { describe, expect, it } from "vitest";
import { parseMeteoraPoolPrice, vaultTokenPrice } from "./pool-stats";
import { CHAIN_POOLS } from "./solana-data";

describe("vaultTokenPrice", () => {
  it("prices every vault, current and future, by its own coin address whatever the name's letter case", () => {
    for (const v of CHAIN_POOLS) {
      expect(vaultTokenPrice({ baseSymbol: v.symbol.toLowerCase(), baseAddress: v.mint, price: 2 }, v.id)).toBe(2);
    }
  });
  it("recognizes Bitcoin when the market writes cbBTC in capitals and omits the address", () => {
    expect(vaultTokenPrice({ baseSymbol: "CBBTC", price: 61000 }, "btc")).toBe(61000);
  });
  it("rejects a price that belongs to a different coin", () => {
    const trump = CHAIN_POOLS.find((v) => v.id === "trump")!;
    expect(vaultTokenPrice({ baseSymbol: "cbBTC", baseAddress: trump.mint, price: 5 }, "btc")).toBeNull();
  });
});

describe("parseMeteoraPoolPrice", () => {
  const gta6 = CHAIN_POOLS.find((v) => v.id === "gta6")!;
  const payload = { address: gta6.pool, token_x: { address: gta6.mint, price: 0.00080615 } };
  it("takes the official pool price when pool and coin match exactly", () => {
    expect(parseMeteoraPoolPrice(payload, gta6.pool, gta6.mint)).toBe(0.00080615);
  });
  it("rejects another pool or another coin", () => {
    expect(parseMeteoraPoolPrice(payload, "11111111111111111111111111111111", gta6.mint)).toBeNull();
    expect(parseMeteoraPoolPrice(payload, gta6.pool, "So11111111111111111111111111111111111111112")).toBeNull();
  });
  it("stays unavailable when the source has no price", () => {
    expect(parseMeteoraPoolPrice({ address: gta6.pool, token_x: { address: gta6.mint } }, gta6.pool, gta6.mint)).toBeNull();
  });
});
