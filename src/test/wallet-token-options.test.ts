import { describe, expect, it } from "vitest";
import { walletTokenOptions } from "@/components/wallet-token-picker";

describe("wallet coin priority", () => {
  it("puts coins with a positive wallet balance ahead of zero and unknown balances", () => {
    const tokens = walletTokenOptions({ USDC: 0n, SOL: undefined, DCTY: 1n, cbBTC: 20n });
    expect(tokens.slice(0, 2).map((x) => x.symbol)).toEqual(["DCTY", "cbBTC"]);
  });
  it("updates the priority when the wallet balance arrives", () => {
    expect(walletTokenOptions({ USDC: 5n, JUP: undefined })[0]?.symbol).toBe("USDC");
    expect(walletTokenOptions({ USDC: 0n, JUP: 30n })[0]?.symbol).toBe("JUP");
  });
  it("keeps unheld receive choices available and searches exact mint addresses", () => {
    const tokens = walletTokenOptions({ DCTY: 1n });
    const usdc = tokens.find((x) => x.symbol === "USDC");
    expect(usdc?.mint).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    expect(walletTokenOptions({}, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v").map((x) => x.symbol)).toEqual(["USDC"]);
  });
});