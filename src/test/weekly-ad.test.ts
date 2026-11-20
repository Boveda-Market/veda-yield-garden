import { describe, expect, it } from "vitest";
import { holdsTrump, nextWeeklyAd, weeklyAdDue } from "@/lib/weekly-ad";
const DAY = 24 * 3600_000;
describe("weekly ad cadence", () => {
  it("shows on first visit", () => expect(weeklyAdDue(null, 1000)).toBe(true));
  it("never waits more than 7 days", () => expect(nextWeeklyAd(0, 1)).toBe(7 * DAY));
  it("never repeats before 4 days", () => expect(nextWeeklyAd(0, 0)).toBe(4 * DAY));
  it("hidden until next time", () => expect(weeklyAdDue(5 * DAY, 3 * DAY)).toBe(false));
  it("a wallet with a TRUMP vault is excluded", () => expect(holdsTrump([{ vaultId: "gta6" }, { vaultId: "trump" }])).toBe(true));
  it("a wallet without TRUMP still sees it", () => expect(holdsTrump([{ vaultId: "gta6" }])).toBe(false));
});
