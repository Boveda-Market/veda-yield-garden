import { describe, expect, it } from "vitest";
import { sweepCandidates, sweepWorthIt, AUTOPILOT_SWEEP_PROGRAMS } from "./autopilot";
const T = (mint: string) => ({ mint });
describe("autopilot leftover sweep", () => {
  it("minimum is $1", () => { expect(sweepWorthIt(999_999n)).toBe(false); expect(sweepWorthIt(1_000_000n)).toBe(true); });
  it("never sweeps USDC, SOL, JupUSD or the vault's own token", () => {
    const list = ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "So11111111111111111111111111111111111111112", "JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD", "VAULT", "MET"].map(T);
    expect(sweepCandidates(list, "VAULT").map((t) => t.mint)).toEqual(["MET"]);
  });
  it("swap may not move tokens with a top-level token transfer", () => expect(AUTOPILOT_SWEEP_PROGRAMS).not.toContain("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"));
});
