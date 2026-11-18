import { describe, expect, it } from "vitest";
import { capitalSeries } from "@/lib/weekly-interest";
const DAY = 86_400_000, now = Date.UTC(2026, 10, 18, 12);
describe("capitalSeries", () => {
  it("counts earlier deposits in capital and only window harvests as earnings", () => {
    const r = [
      { kind: "deposit", at: now - 40 * DAY, usdcRaw: "100000000" },
      { kind: "harvest", at: now - 40 * DAY, usdcRaw: "9000000" },
      { kind: "harvest", at: now - 2 * DAY, usdcRaw: "1000000" },
      { kind: "withdraw", at: now - DAY, usdcRaw: "30000000" },
    ];
    const s = capitalSeries(r, now, 7);
    expect(s[0]!.capitalMicro).toBe(100_000_000n);
    expect(s[6]!.capitalMicro).toBe(70_000_000n);
    expect(s[6]!.earnedMicro).toBe(1_000_000n);
    expect(s.every((d, i) => i === 0 || d.earnedMicro >= s[i - 1]!.earnedMicro)).toBe(true);
  });
});
