import { describe, expect, it } from "vitest";
import { FIRST_DEPOSIT_DEFAULT, firstDepositTotal } from "./first-deposit";
describe("first deposit", () => {
  it("suggests $50", () => expect(FIRST_DEPOSIT_DEFAULT).toBe("50"));
  it("$50 deposit + $5 activation asks Coinbase for $55", () => expect(firstDepositTotal(50_000_000n, 5_000_000n)).toBe(55_000_000n));
  it("no activation when already active", () => expect(firstDepositTotal(50_000_000n, 0n)).toBe(50_000_000n));
});
