import { describe, expect, it } from "vitest";
import { withdrawFee } from "./fees";
describe("withdraw fee", () => {
  it("charges a fixed 1%", () => expect(withdrawFee(25_000_000n)).toBe(250_000n));
  it("charges 1% even on small amounts", () => expect(withdrawFee(5_000_000n)).toBe(50_000n));
});
