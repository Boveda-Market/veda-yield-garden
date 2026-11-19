import { describe, expect, it } from "vitest";
import { campaignGap, LAUNCH, gta6VideoDue, holderRankDue, moveSource, showGta6Video } from "./gta6-video-popup";
const pos = (vaultId: string) => ({ address: "x", vaultId, symbol: "", tokenAmount: "0", usdcAmount: "0", feeTokenAmount: "0", feeUsdcAmount: "0", locked: false }) as never;
describe("GTA6 video popup", () => {
  it("shows to new users with no vaults", () => expect(showGta6Video([])).toBe(true));
  it("hides once the user has a GTA6 deposit", () => expect(showGta6Video([pos("gta6")])).toBe(false));
  it("shows on every visit when the user has no dollars", () => expect([1, 2, 3, 4].every((v) => gta6VideoDue(false, v))).toBe(true));
  it("shows once every 3 visits when the user has dollars but no vaults", () => expect([1, 2, 3, 4, 5, 6, 7].map((v) => gta6VideoDue(true, v))).toEqual([true, false, false, true, false, false, true]));
  const D = 24 * 3600_000, L = LAUNCH.dcty;
  it("new vault campaign: every 2 days in week 1, every 4 in week 2, once in week 3, then off", () => {
    expect(campaignGap(L, L + D)).toBe(2 * D);
    expect(campaignGap(L, L + 8 * D)).toBe(4 * D);
    expect(campaignGap(L, L + 15 * D)).toBe(7 * D);
    expect(campaignGap(L, L + 21 * D)).toBeNull();
  });
  it("holders missing a vault in campaign follow its cadence", () => {
    expect(holderRankDue([pos("gta6")], null, L + D)).toBe(true);
    expect(holderRankDue([pos("gta6")], L, L + 2 * D - 1)).toBe(false);
    expect(holderRankDue([pos("gta6")], L, L + 2 * D)).toBe(true);
    expect(holderRankDue([pos("gta6")], null, L + 22 * D)).toBe(false);
  });
  it("after moving vaults it stays silent until a new vault is added", () => {
    expect(holderRankDue([pos("gta6")], null, L + D, ["gta6", "dcty"])).toBe(false);
    expect(holderRankDue([pos("gta6")], null, L + D, ["gta6"])).toBe(true);
  });
  it("holders with every high-octane vault never see it", () => expect(holderRankDue([pos("gta6"), pos("dcty")], null, 0)).toBe(false));
  it("suggests moving from another open vault, never the target itself", () => {
    expect(moveSource([pos("gta6")], "dcty")?.vaultId).toBe("gta6");
    expect(moveSource([pos("dcty")], "dcty")).toBeNull();
  });
});
