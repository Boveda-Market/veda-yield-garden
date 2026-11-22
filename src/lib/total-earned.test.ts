import { describe, expect, it } from "vitest";
import { totalEarned } from "./total-earned";

describe("totalEarned", () => {
  it("adds harvested and pending", () => expect(totalEarned(3, 1.2, 100)?.total).toBeCloseTo(4.2));
  it("percent is over capital in vaults", () => expect(totalEarned(3, 1.2, 100)?.percent).toBeCloseTo(4.2));
  it("stays unavailable without harvested value", () => expect(totalEarned(null, 5, 100)).toBeNull());
  it("no percent without capital", () => expect(totalEarned(2, 0, 0)?.percent).toBeNull());
});
