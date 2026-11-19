import { describe, expect, it } from "vitest";
import { CHAIN_POOLS, USDC_MINT, realWalletInput, tokenAmount } from "@/lib/solana-data";

describe("Real chain amounts and supported pools", () => {
  it("keeps USDC's six decimals without floating point loss", () => {
    expect(tokenAmount("100000001", 6)).toBe("100.000001");
    expect(tokenAmount("9007199254740993", 6)).toBe("9007199254.740993");
  });
  it("keeps SOL's nine decimals distinct from USDC", () => {
    expect(tokenAmount("1000000001", 9)).toBe("1.000000001");
  });
  it("rejects negative or invalid amounts", () => {
    expect(() => tokenAmount("-1", 6)).toThrow();
    expect(() => tokenAmount("1.1", 6)).toThrow();
  });
  it("restricts pool discovery to the exact supported pool addresses", () => {
    expect(CHAIN_POOLS.map((pool) => pool.pool)).toEqual([
      "8Pm2kZpnxD3hoMmt4bjStX2Pw2Z9abpbHzZxMPqxPmie",
      "BnztueWcXv93mgW7yJe8WYpnCxpz34nujPhfjQT6SLu1",
      "99bL7ZdcQxcrkdJDKGoGpAhqZUMYEHzhMvtNadiZJpE8",
      "F7jNbQWivmiBDjzHDxQq32oWLW6cju4CdGyVw9RZV6tX",
    ]);
    expect(USDC_MINT).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  });
  it("does not let a client inject RPC methods or a private URL", () => {
    expect(realWalletInput.safeParse({ wallet: CHAIN_POOLS[0].pool, method: "sendTransaction" }).success).toBe(false);
    expect(realWalletInput.safeParse({ wallet: "https://example.org" }).success).toBe(false);
  });
});