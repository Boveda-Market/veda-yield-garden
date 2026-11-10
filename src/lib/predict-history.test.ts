import { describe, expect, it } from "vitest";
import { historyTotals, mergeHistory, netDeposit, recordState, type PredictRecord } from "./predict-history";

const base = { pubkey: "a", marketId: "POLY-1-0", title: "BTC", side: "up", outcome: "Up", contractsMicro: "10000000", costMicro: "5000000", valueMicro: null, payoutMicro: "10000000", pnlMicro: null, closeTime: 100, status: "open", result: null, isYes: true } as const;

describe("predict history", () => {
  it("keeps positions the venue stops listing", () => {
    const h = mergeHistory([], [{ ...base }], 1);
    const after = mergeHistory(h, [], 2);
    expect(after).toHaveLength(1);
    expect(after[0]!.gone).toBe(true);
  });
  it("won returns full payout to wallet", () => {
    const r = { ...base, status: "closed", result: "yes", seenAt: 0 } as PredictRecord;
    expect(recordState(r, 200)).toBe("won");
    expect(netDeposit(r, 200)).toBe(10000000n);
  });
  it("lost returns 0 and sold returns sale value", () => {
    expect(netDeposit({ ...base, status: "closed", result: "no", seenAt: 0 } as PredictRecord, 200)).toBe(0n);
    expect(netDeposit({ ...base, soldMicro: "4800000", seenAt: 0 } as PredictRecord, 50)).toBe(4800000n);
  });
  it("totals net PNL from deposits minus cost", () => {
    const t = historyTotals([{ ...base, pubkey: "w", status: "closed", result: "yes", seenAt: 0 }, { ...base, pubkey: "l", status: "closed", result: "no", seenAt: 0 }] as PredictRecord[], 200);
    expect(t.returned).toBe(10000000n);
    expect(t.pnl).toBe(0n);
  });
});
