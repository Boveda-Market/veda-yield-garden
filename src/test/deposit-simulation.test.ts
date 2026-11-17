import { describe, expect, it } from "vitest";
import { simulationAmounts, simulationInput } from "@/lib/deposit-simulation";
import { FEE_WALLET } from "@/lib/fees";

describe("read-only deposit simulation", () => {
  it("charges no entry fee from the first dollar", () => {
    expect(simulationAmounts("1")).toEqual({ gross: 1_000_000n, fee: 0n, net: 1_000_000n });
  });
  it("keeps the specified fee recipient", () => {
    expect(FEE_WALLET).toBe("93bF1K1dWMJseMuf15WLaNt1diVGACQ9gUFA7szsSbs7");
  });
  it("allows only the selected pilot amounts and exact known vaults", () => {
    expect(() => simulationAmounts("0.99")).toThrow();
    expect(() => simulationAmounts("5000.000001")).toThrow();
    expect(simulationInput.safeParse({ wallet: FEE_WALLET, vaultId: "sol", amount: "1" }).success).toBe(true);
    expect(simulationInput.safeParse({ wallet: FEE_WALLET, vaultId: "arbitrary", amount: "1" }).success).toBe(false);
  });
  it("accepts 5,000 USDC exactly with no entry fee", () => {
    expect(simulationAmounts("5000")).toEqual({ gross: 5_000_000_000n, fee: 0n, net: 5_000_000_000n });
    expect(simulationInput.safeParse({ wallet: FEE_WALLET, vaultId: "sol", amount: "5000" }).success).toBe(true);
  });
  it("rejects attempts to supply RPC URLs or send options", () => {
    expect(simulationInput.safeParse({ wallet: FEE_WALLET, vaultId: "sol", amount: "1", send: true }).success).toBe(false);
    expect(simulationInput.safeParse({ wallet: FEE_WALLET, vaultId: "sol", amount: "1", rpc: "https://example.com" }).success).toBe(false);
  });
});