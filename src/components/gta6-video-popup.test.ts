import { describe, expect, it } from "vitest";
import { gta6VideoDue, holderRankDue, HOLDER_GAP_MS, moveSource, showGta6Video } from "./gta6-video-popup";
const pos = (vaultId: string) => ({ address: "x", vaultId, symbol: "", tokenAmount: "0", usdcAmount: "0", feeTokenAmount: "0", feeUsdcAmount: "0", locked: false }) as never;
describe("GTA6 video popup", () => {
  it("shows to new users with no vaults", () => expect(showGta6Video([])).toBe(true));
  it("hides once the user has a GTA6 deposit", () => expect(showGta6Video([pos("gta6")])).toBe(false));
  it("shows on every visit when the user has no dollars", () => expect([1, 2, 3, 4].every((v) => gta6VideoDue(false, v))).toBe(true));
  it("shows once every 3 visits when the user has dollars but no vaults", () => expect([1, 2, 3, 4, 5, 6, 7].map((v) => gta6VideoDue(true, v))).toEqual([true, false, false, true, false, false, true]));
  it("holders missing a high-octane vault see it at most once a week", () => {
    expect(holderRankDue([pos("gta6")], null, 0)).toBe(true);
    expect(holderRankDue([pos("gta6")], 0, HOLDER_GAP_MS - 1)).toBe(false);
    expect(holderRankDue([pos("gta6")], 0, HOLDER_GAP_MS)).toBe(true);
  });
  it("holders with every high-octane vault never see it", () => expect(holderRankDue([pos("gta6"), pos("dcty")], null, 0)).toBe(false));
  it("suggests moving from another open vault, never the target itself", () => {
    expect(moveSource([pos("gta6")], "dcty")?.vaultId).toBe("gta6");
    expect(moveSource([pos("dcty")], "dcty")).toBeNull();
  });
});
