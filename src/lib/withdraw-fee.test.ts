import { describe, expect, it } from "vitest";
import { withdrawFee } from "./fees";
describe("withdraw fee", () => {
  it("charges 2% under $100", () => expect(withdrawFee(25_000_000n)).toBe(500_000n));
  it("charges 0.50% from $2,500", () => expect(withdrawFee(2_500_000_000n)).toBe(12_500_000n));
});
