import { describe, expect, it } from "vitest";
import { parseUsdcMicro, usdcTransferInput } from "@/lib/usdc-transfer";

const A = "93bF1K1dWMJseMuf15WLaNt1diVGACQ9gUFA7szsSbs7";
const B = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("usdc transfer", () => {
  it("parses amounts into integer micro-USDC", () => {
    expect(parseUsdcMicro("12.5")).toBe(12_500_000n);
    expect(parseUsdcMicro("1,000")).toBe(1_000_000_000n);
    expect(parseUsdcMicro("0.1234567")).toBeNull();
    expect(parseUsdcMicro("-1")).toBeNull();
  });
  it("rejects sending to yourself and amounts under 0.01", () => {
    expect(usdcTransferInput.safeParse({ from: A, to: A, amountMicro: "50000" }).success).toBe(false);
    expect(usdcTransferInput.safeParse({ from: A, to: B, amountMicro: "9999" }).success).toBe(false);
    expect(usdcTransferInput.safeParse({ from: A, to: B, amountMicro: "10000" }).success).toBe(true);
  });
});
