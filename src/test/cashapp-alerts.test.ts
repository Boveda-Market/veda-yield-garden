import { describe, expect, it } from "vitest";
import { cashAppOutcome, cashAppTrackExpired, cashAppSettledText } from "@/lib/cashapp-alerts";

describe("Cash App withdrawal Telegram follow-up", () => {
  it("announces only finished withdrawals", () => {
    expect(cashAppOutcome("settled")).toBe("settled");
    expect(cashAppOutcome("refunded")).toBe("refunded");
    expect(cashAppOutcome("waiting")).toBeNull();
    expect(cashAppOutcome("processing")).toBeNull();
  });
  it("stops following after 24 hours", () => {
    const now = Date.parse("2026-11-29T12:00:00Z");
    expect(cashAppTrackExpired("2026-11-28T13:00:00Z", now)).toBe(false);
    expect(cashAppTrackExpired("2026-11-28T11:00:00Z", now)).toBe(true);
  });
  it("includes the Bitcoin amount when valid", () => {
    expect(cashAppSettledText("0.00041097")).toContain("0.00041097 BTC");
    expect(cashAppSettledText("<b>")).not.toContain("<b>BTC");
  });
});
