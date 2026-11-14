import { describe, expect, it } from "vitest";
import { treasuryReserveAlert } from "./treasury-reserve";

describe("treasuryReserveAlert", () => {
  it("alerts once when below 0.003 SOL", () => { expect(treasuryReserveAlert(2_999_999n, false)).toBe("low"); expect(treasuryReserveAlert(0n, true)).toBeNull(); });
  it("does not alert at 0.02 SOL", () => { expect(treasuryReserveAlert(20_000_000n, false)).toBeNull(); });
  it("announces recovery only at 0.006 SOL", () => { expect(treasuryReserveAlert(5_000_000n, true)).toBeNull(); expect(treasuryReserveAlert(6_000_000n, true)).toBe("restored"); });
});
