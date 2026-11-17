import { describe, expect, it } from "vitest";
import { showGta6Video } from "./gta6-video-popup";
const pos = (vaultId: string) => ({ address: "x", vaultId, symbol: "", tokenAmount: "0", usdcAmount: "0", feeTokenAmount: "0", feeUsdcAmount: "0", locked: false }) as never;
describe("GTA6 video popup", () => {
  it("shows to new users with no vaults", () => expect(showGta6Video([])).toBe(true));
  it("hides once the user has a GTA6 deposit", () => expect(showGta6Video([pos("gta6")])).toBe(false));
});
