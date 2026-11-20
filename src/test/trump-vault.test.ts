import { describe, expect, it } from "vitest";
import { CHAIN_POOLS, isOperableVault } from "@/lib/solana-data";
import { VAULTS } from "@/lib/vaults";
import { PILOT_VAULTS } from "@/lib/pilot-deposit";

describe("TRUMP vault", () => {
  it("uses the exact TRUMP/USDC pool and mint, classic SPL, 6 decimals", () => {
    const c = CHAIN_POOLS.find((p) => p.id === "trump");
    expect(c?.pool).toBe("3C5YE97HADPDxZehYq9Cis8AXr9aNyrUsczKzE1nDbW9");
    expect(c?.mint).toBe("6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN");
    expect(c?.decimals).toBe(6);
    expect((c as { tokenProgram?: string } | undefined)?.tokenProgram).toBeUndefined();
  });
  it("is operable, autopilot-ready and high-octane", () => {
    expect(isOperableVault("trump")).toBe(true);
    expect(PILOT_VAULTS).toContain("trump");
    expect(VAULTS.find((v) => v.id === "trump")?.badge).toBeTruthy();
  });
});
