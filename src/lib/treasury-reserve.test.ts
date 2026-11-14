import { describe, expect, it } from "vitest";
import { treasuryReserveAlert } from "./treasury-reserve";

describe("treasuryReserveAlert", () => {
  it("alerts once when below 0.05 SOL", () => { expect(treasuryReserveAlert(0n, false)).toBe("low"); expect(treasuryReserveAlert(0n, true)).toBeNull(); });
  it("does not alert at 0.05 SOL", () => { expect(treasuryReserveAlert(50_000_000n, false)).toBeNull(); });
  it("announces recovery only at 0.10 SOL", () => { expect(treasuryReserveAlert(90_000_000n, true)).toBeNull(); expect(treasuryReserveAlert(100_000_000n, true)).toBe("restored"); });
});
