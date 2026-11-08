import { describe, expect, it } from "vitest";
import { meteoraHistoryInput, meteoraMetrics, type MeteoraRecord } from "@/lib/meteora-history";
import { CHAIN_POOLS } from "@/lib/solana-data";

const row = (id: string, kind: MeteoraRecord["kind"], usdcRaw: string, tokenRaw = "0"): MeteoraRecord => ({ id, signature: id, at: 1, slot: 1, pool: CHAIN_POOLS[0].pool, position: CHAIN_POOLS[0].pool, kind, tokenRaw, usdcRaw });
describe("Meteora recorded portfolio metrics", () => {
  it("sums only actual claims as harvested fees, never returned principal", () => {
    const result = meteoraMetrics([row("deposit", "deposit", "1000000"), row("claim", "harvest", "31", "339"), row("withdraw", "withdraw", "972078")]);
    expect(result.harvested).toBe("0.000031");
    expect(result.deposited).toBe("1");
    expect(result.usdcHarvestPercent).toBe(0.0031);
    expect(result.totals[0]?.harvestToken).toBe(339n);
  });
  it("deduplicates events across repeated pages while retaining separate events in one transaction", () => {
    const claim = row("sig:4:2", "harvest", "31");
    expect(meteoraMetrics([claim, claim, row("sig:5:1", "harvest", "1")]).harvested).toBe("0.000032");
  });
  it("preserves integer amounts above floating point precision", () => {
    expect(meteoraMetrics([row("large", "deposit", "9007199254740993")]).deposited).toBe("9007199254.740993");
  });
  it("leaves percentage unavailable without recorded deposits", () => {
    expect(meteoraMetrics([row("claim", "harvest", "31")]).usdcHarvestPercent).toBeNull();
  });
  it("rejects arbitrary RPC or send options", () => {
    expect(meteoraHistoryInput.safeParse({ wallet: CHAIN_POOLS[0].pool, send: true }).success).toBe(false);
    expect(meteoraHistoryInput.safeParse({ wallet: CHAIN_POOLS[0].pool, before: "invalid" }).success).toBe(false);
  });
});