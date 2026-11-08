import { describe, expect, it } from "vitest";
import { trialPortfolioMetrics, recordBalance, readBalancePoints } from "@/lib/portfolio";
describe("transparent portfolio calculations", () => {
  it("does not treat moving credits to a vault as a profit", () => {
    expect(trialPortfolioMetrics(900, 100, 0, []).pnl).toBe(0);
  });
  it("reports net PNL including paid exit fees against the 1000 starting credits", () => {
    const result = trialPortfolioMetrics(999, 0, 0, []);
    expect(result.pnl).toBe(-1); expect(result.pnlPercent).toBe(-0.1);
  });
  it("counts reinvested deposit volume, not harvest or exit proceeds", () => {
    const rows = [{ id: "1", at: 1, kind: "deposit" as const, vaultId: "sol", gross: 100, net: 100, fee: 0 }, { id: "2", at: 2, kind: "deposit" as const, vaultId: "sol", gross: 100, net: 100, fee: 0 }];
    expect(trialPortfolioMetrics(800, 200, 2, rows).volume).toBe(200);
  });
  it("stores at most one observation per minute and 1000 total points", () => {
    expect(recordBalance([{ at: 60000, balance: 1000 }], { at: 61000, balance: 1001 })).toEqual([{ at: 61000, balance: 1001 }]);
    expect(recordBalance(Array.from({ length: 1000 }, (_, index) => ({ at: index * 60000, balance: 1000 })), { at: 1000 * 60000, balance: 1001 })).toHaveLength(1000);
  });
  it("never generates historical points from missing data", () => {
    expect(readBalancePoints(null)).toEqual([]); expect(readBalancePoints("broken")).toEqual([]);
  });
});