import { describe, expect, it } from "vitest";
import { totalEarned } from "./total-earned";

describe("totalEarned", () => {
  it("adds harvested and pending", () => expect(totalEarned(3, 1.2, 100)?.total).toBeCloseTo(4.2));
  it("percent is over total deposited", () => expect(totalEarned(10, 3, 200)?.percent).toBeCloseTo(6.5));
  it("stays unavailable without harvested value", () => expect(totalEarned(null, 5, 100)).toBeNull());
  it("no percent when nothing deposited remains", () => expect(totalEarned(2, 0, 0)?.percent).toBeNull());
});
