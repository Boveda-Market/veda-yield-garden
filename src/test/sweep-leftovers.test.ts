import { describe, expect, it } from "vitest";
import { sweepTargets, worthSweeping } from "@/lib/sweep-leftovers";

describe("liquidation leftover sweep", () => {
  it("converts JupUSD and MET leftovers but never the SOL network reserve", () => {
    const symbols = sweepTargets().map((t) => t.symbol);
    expect(symbols).toContain("JupUSD");
    expect(symbols).toContain("MET");
    expect(symbols).not.toContain("SOL");
  });
  it("skips leftovers worth less than 0.01 USDC", () => {
    expect(worthSweeping(9_999n)).toBe(false);
    expect(worthSweeping(10_000n)).toBe(true);
  });
});

describe("extra coins cleanup never sells the network reserve", () => {
  it("SOL is not a cleanup target", () => expect(sweepTargets().map((t) => t.symbol)).not.toContain("SOL"));
});

import { autoJupUsdDue, AUTO_JUPUSD_COOLDOWN_MS } from "@/lib/sweep-leftovers";
describe("automatic Sube/Baja dollar conversion", () => {
  it("converts $0.01 or more when never tried", () => expect(autoJupUsdDue(10_000n, null, 0)).toBe(true));
  it("skips dust below $0.01", () => expect(autoJupUsdDue(9_999n, null, 0)).toBe(false));
  it("waits 10 minutes between attempts", () => { expect(autoJupUsdDue(5_000_000n, 0, AUTO_JUPUSD_COOLDOWN_MS - 1)).toBe(false); expect(autoJupUsdDue(5_000_000n, 0, AUTO_JUPUSD_COOLDOWN_MS)).toBe(true); });
});
