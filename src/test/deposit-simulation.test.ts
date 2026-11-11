import { describe, expect, it } from "vitest";
import { simulationAmounts, simulationInput } from "@/lib/deposit-simulation";
import { FEE_WALLET } from "@/lib/fees";

describe("read-only deposit simulation", () => {
  it("deducts a flat 1% entry fee from the first dollar", () => {
    expect(simulationAmounts("1")).toEqual({ gross: 1_000_000n, fee: 10_000n, net: 990_000n });
  });
  it("keeps the specified fee recipient", () => {
    expect(FEE_WALLET).toBe("93bF1K1dWMJseMuf15WLaNt1diVGACQ9gUFA7szsSbs7");
  });
  it("allows only the selected pilot amounts and exact known vaults", () => {
    expect(() => simulationAmounts("0.99")).toThrow();
    expect(() => simulationAmounts("10000.000001")).toThrow();
    expect(simulationInput.safeParse({ wallet: FEE_WALLET, vaultId: "sol", amount: "1" }).success).toBe(true);
    expect(simulationInput.safeParse({ wallet: FEE_WALLET, vaultId: "arbitrary", amount: "1" }).success).toBe(false);
  });
  it("accepts 10,000 USDC exactly with a 1% fee", () => {
    expect(simulationAmounts("10000")).toEqual({ gross: 10_000_000_000n, fee: 100_000_000n, net: 9_900_000_000n });
    expect(simulationInput.safeParse({ wallet: FEE_WALLET, vaultId: "sol", amount: "10000" }).success).toBe(true);
  });
  it("rejects attempts to supply RPC URLs or send options", () => {
    expect(simulationInput.safeParse({ wallet: FEE_WALLET, vaultId: "sol", amount: "1", send: true }).success).toBe(false);
    expect(simulationInput.safeParse({ wallet: FEE_WALLET, vaultId: "sol", amount: "1", rpc: "https://example.com" }).success).toBe(false);
  });
});