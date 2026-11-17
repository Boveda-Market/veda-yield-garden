import { describe, expect, it } from "vitest";
import { weeklyInterest, weekTotalMicro, weeklySummaryText } from "@/lib/weekly-interest";
import { depositAlertText, harvestAlertText, exitAlertText } from "@/lib/telegram-alerts.functions";
import { autopilotDoneText } from "@/lib/autopilot";

const now = Date.parse("2026-11-17T18:00:00Z");
describe("weekly interest", () => {
  it("buckets harvests into 7 days, today last", () => {
    const d = weeklyInterest([{ kind: "harvest", at: now - 1000, usdcRaw: "2000000" }, { kind: "harvest", at: now - 86_400_000 * 2, usdcRaw: "500000" }, { kind: "deposit", at: now, usdcRaw: "9000000" }, { kind: "harvest", at: now - 86_400_000 * 9, usdcRaw: "7000000" }], now);
    expect(d).toHaveLength(7);
    expect(d[6]!.micro).toBe(2_000_000n);
    expect(d[4]!.micro).toBe(500_000n);
    expect(weekTotalMicro(d)).toBe(2_500_000n);
  });
  it("summary says no action needed", () => expect(weeklySummaryText({ weekMicro: 18_400_000n, harvests: 3, from: "11", to: "17" })).toContain("+$18.40"));
});
describe("alert texts", () => {
  it("deposit shows amount and vault", () => { const s = depositAlertText("150", "GTA6"); expect(s).toContain("$150.00"); expect(s).toContain("GTA6"); expect(s).toContain("No tienes que hacer ninguna acción"); });
  it("harvest shows amount", () => expect(harvestAlertText("12.456", "GTA6")).toContain("+$12.46"));
  it("exit and rebalance say no action", () => { expect(exitAlertText(50, "10")).toContain("ninguna acción"); expect(autopilotDoneText("Bóveda GTA6", "100", 2)).toContain("No tienes que hacer nada"); });
});

describe("weekly interest views", () => {
  it("adds harvested vault tokens valued at today's price and builds the running total", async () => {
    const { cumulative } = await import("@/lib/weekly-interest");
    const d = weeklyInterest([{ kind: "harvest", at: now - 1000, usdcRaw: "8110924", tokenRaw: "502048561678", pool: "p" }, { kind: "harvest", at: now - 86_400_000 * 3, usdcRaw: "1000000" }], now, 0, (r) => r.tokenRaw ? 8_950_000n : 0n);
    expect(d[6]!.micro).toBe(17_060_924n);
    expect(cumulative(d)).toEqual([0n, 0n, 0n, 1_000_000n, 1_000_000n, 1_000_000n, 18_060_924n]);
  });
});
