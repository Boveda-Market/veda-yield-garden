import { describe, expect, it } from "vitest";
import { rangeSince } from "@/hooks/use-range-alerts";
import { rangeAlertText } from "@/lib/dlmm";
import { ALERT_KINDS } from "@/lib/alert-kinds";

describe("range alert timing", () => {
  it("uses the earliest of the background record and this browser's sighting", () => {
    const server = "2026-11-15T12:00:00.000Z";
    expect(rangeSince(server, Date.parse("2026-11-15T12:05:00Z"))).toBe(Date.parse(server));
    expect(rangeSince(undefined, 5)).toBe(5);
    expect(rangeSince(undefined, undefined)).toBeNull();
  });
  it("says whether the price went above or below and can be muted on its own", () => {
    expect(rangeAlertText("Bóveda GTA6", true)).toContain("subió por encima");
    expect(rangeAlertText("Bóveda GTA6", false)).toContain("bajó por debajo");
    expect(ALERT_KINDS).toContain("range");
  });
});

import { trackRangePositions } from "@/lib/range-monitor";
describe("out-of-range monitor", () => {
  const base = { address: "42fHb9eKgArQCDYePjRfevhKNHTJJp59fSkkcoEhCkmx", vaultId: "gta6", symbol: "GTA6", tokenAmount: "1", usdcAmount: "0", feeTokenAmount: "0", feeUsdcAmount: "0", locked: false } as const;
  const run = async (outOfRange: boolean, row: { first_down_at: string | null; operator_alerted: boolean } | null, now: number) => {
    const saved: unknown[] = [], cleared: string[] = [], alerts: string[] = [];
    const rows = new Map(row ? [[`range:${base.address}`, { service: `range:${base.address}`, ...row }]] : []);
    await trackRangePositions({ privyUserId: "u1", positions: [{ ...base, outOfRange }], rows, now, store: { save: async (r) => saved.push(r), clear: async (k) => cleared.push(k) }, alert: async (_id, html) => alerts.push(html), vaultName: () => "Bóveda GTA6" });
    return { saved, cleared, alerts };
  };
  const now = Date.parse("2026-11-15T12:00:00Z");
  it("starts the clock without alerting on first sighting", async () => {
    const r = await run(true, null, now);
    expect(r.alerts).toHaveLength(0);
    expect(r.saved).toHaveLength(1);
  });
  it("alerts once after 10 minutes out of range", async () => {
    const r = await run(true, { first_down_at: new Date(now - 10 * 60_000).toISOString(), operator_alerted: false }, now);
    expect(r.alerts).toHaveLength(1);
    const again = await run(true, { first_down_at: new Date(now - 30 * 60_000).toISOString(), operator_alerted: true }, now);
    expect(again.alerts).toHaveLength(0);
  });
  it("clears the record when the position is back in range", async () => {
    const r = await run(false, { first_down_at: new Date(now - 30 * 60_000).toISOString(), operator_alerted: true }, now);
    expect(r.cleared).toEqual([`range:${base.address}`]);
  });
});

import { rangeAlertButton, rebalanceLink } from "@/lib/dlmm";
describe("rebalance deep link in alerts", () => {
  it("Telegram button opens the rebalance sheet for that exact position in Mi Billetera", () => {
    expect(rebalanceLink("5WbsuG4T4FrtwYDCB7YWTDxLj47yqAwAJD9o4Rk886nu")).toBe("https://bovedamarket.app/wallet?rebalance=5WbsuG4T4FrtwYDCB7YWTDxLj47yqAwAJD9o4Rk886nu");
    expect(rangeAlertButton("abc").text).toBe("🎯 Rebalancear ahora");
  });
  it("the 10-minute alert carries the rebalance button", async () => {
    const buttons: { url: string }[] = [];
    const now = Date.now();
    const rows = new Map([["range:Pos1", { service: "range:Pos1", first_down_at: new Date(now - 11 * 60_000).toISOString(), operator_alerted: false }]]);
    const { trackRangePositions: track } = await import("@/lib/range-monitor");
    await track({ privyUserId: "u1", positions: [{ address: "Pos1", vaultId: "gta6", symbol: "GTA6", tokenAmount: "1", usdcAmount: "1", feeTokenAmount: "0", feeUsdcAmount: "0", locked: false, outOfRange: true }] as never, rows, now, store: { save: async () => 0, clear: async () => 0 }, alert: async (_id, _html, b) => buttons.push(b), vaultName: () => "Bóveda GTA6" });
    expect(buttons.map((b) => b.url)).toEqual(["https://bovedamarket.app/wallet?rebalance=Pos1"]);
  });
});
