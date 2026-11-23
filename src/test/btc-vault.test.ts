import { describe, expect, it } from "vitest";
import { CHAIN_POOLS, isDlmmVault, isOperableVault } from "@/lib/solana-data";
import { VAULTS } from "@/lib/vaults";
import { PILOT_VAULTS } from "@/lib/pilot-deposit";

describe("Bitcoin vault", () => {
  it("uses the exact cbBTC/USDC range pool and mint, classic SPL, 8 decimals", () => {
    const c = CHAIN_POOLS.find((p) => p.id === "btc");
    expect(c?.pool).toBe("7ubS3GccjhQY99AYNKXjNJqnXjaokEdfdV915xnCb96r");
    expect(c?.mint).toBe("cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij");
    expect(c?.decimals).toBe(8);
    expect((c as { tokenProgram?: string } | undefined)?.tokenProgram).toBeUndefined();
    expect(isDlmmVault("btc")).toBe(true);
  });
  it("is operable, autopilot-ready and featured", () => {
    expect(isOperableVault("btc")).toBe(true);
    expect(PILOT_VAULTS).toContain("btc");
    const v = VAULTS.find((x) => x.id === "btc");
    expect(v?.pool).toBe("7ubS3GccjhQY99AYNKXjNJqnXjaokEdfdV915xnCb96r");
    expect(v?.badge).toBeTruthy();
  });
});
