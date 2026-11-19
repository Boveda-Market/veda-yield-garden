import { describe, expect, it } from "vitest";
import { ExtensionType } from "@solana/spl-token";
import { CHAIN_POOLS, isDlmmVault, isOperableVault, vaultDecimals } from "@/lib/solana-data";
import { VAULTS } from "@/lib/vaults";
import { simulationInput } from "@/lib/deposit-simulation";
import { token2022ExtensionsSafe, xProgram, dlmmConfig } from "@/lib/dlmm.server";

describe("DCTY vault", () => {
  it("is a registered, operable range vault on the exact pool and mint", () => {
    const c = CHAIN_POOLS.find((p) => p.id === "dcty");
    expect(c?.pool).toBe("F7jNbQWivmiBDjzHDxQq32oWLW6cju4CdGyVw9RZV6tX");
    expect(c?.mint).toBe("9hjBLBrc7WZW2H8UQvBAvG5WiTZotXUv2Bdcn4f4pump");
    expect(vaultDecimals("dcty")).toBe(6);
    expect(isDlmmVault("dcty")).toBe(true);
    expect(isOperableVault("dcty")).toBe(true);
    expect(VAULTS.find((v) => v.id === "dcty")?.badge).toBeTruthy();
  });
  it("accepts deposits from $1 to $5,000 like GTA6", () => {
    const base = { wallet: "93bF1K1dWMJseMuf15WLaNt1diVGACQ9gUFA7szsSbs7", vaultId: "dcty" };
    expect(simulationInput.safeParse({ ...base, amount: "1" }).success).toBe(true);
    expect(simulationInput.safeParse({ ...base, amount: "5000" }).success).toBe(true);
    expect(simulationInput.safeParse({ ...base, amount: "5001" }).success).toBe(false);
  });
  it("uses Token-2022 for DCTY and classic SPL for GTA6", () => {
    expect(xProgram(dlmmConfig("dcty")!).toBase58()).toBe("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
    expect(xProgram(dlmmConfig("gta6")!).toBase58()).toBe("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  });
  it("only allows name/logo extensions; fees or hooks block the vault", () => {
    expect(token2022ExtensionsSafe([ExtensionType.MetadataPointer, ExtensionType.TokenMetadata])).toBe(true);
    expect(token2022ExtensionsSafe([ExtensionType.MetadataPointer, ExtensionType.TransferFeeConfig])).toBe(false);
    expect(token2022ExtensionsSafe([ExtensionType.TransferHook])).toBe(false);
    expect(token2022ExtensionsSafe([ExtensionType.PermanentDelegate])).toBe(false);
  });
});
