import { describe, expect, it } from "vitest";
import { FEE_WALLET, harvestFee, predictClaimFee, progressiveFee, rotateFee, withdrawFee, transactionAmounts, validDeposit } from "@/lib/fees";
import { emailSignupSchema } from "@/lib/email-signup";
describe("Operational USDC fee", () => {
  it("vault deposits are free (0%) in every tier", () => { for (const n of [50, 99.99, 100, 1000, 5000]) expect(transactionAmounts(n, "deposit").fee).toBe(0); });
  it("exit tiers: 1.5% / 1% / 0.75% / 0.40%", () => { expect(progressiveFee(25_000_000n)).toBe(375_000n); expect(progressiveFee(100_000_000n)).toBe(1_000_000n); expect(progressiveFee(1_000_000_000n)).toBe(7_500_000n); expect(progressiveFee(5_000_000_000n)).toBe(20_000_000n); });
  it("withdraw tiers: 2% / 1.25% / 0.75% / 0.50%", () => { expect(withdrawFee(50_000_000n)).toBe(1_000_000n); expect(withdrawFee(200_000_000n)).toBe(2_500_000n); expect(withdrawFee(500_000_000n)).toBe(3_750_000n); expect(withdrawFee(10_000_000_000n)).toBe(50_000_000n); });
  it("harvest: 3% under $100, 2.25% from $100, 1.5% from $500, 0.75% from $2,500 (tier by harvested amount)", () => { expect(harvestFee(1_000_000n, 2_500_000_000n)).toBe(30_000n); expect(harvestFee(100_000_000n)).toBe(2_250_000n); expect(harvestFee(500_000_000n)).toBe(7_500_000n); expect(harvestFee(2_500_000_000n)).toBe(18_750_000n); });
  it("Up/Down: 2% of the total claimed payout", () => { expect(predictClaimFee(20_000_000n, 10_000_000n)).toBe(400_000n); expect(predictClaimFee(0n, 10_000_000n)).toBe(0n); });
  it("vault move fee is progressive 3% / 2.25% / 1.5% / 1%", () => {
    expect(rotateFee(50_000_000n)).toBe(1_500_000n);
    expect(rotateFee(100_000_000n)).toBe(2_250_000n);
    expect(rotateFee(1_000_000_000n)).toBe(15_000_000n);
    expect(rotateFee(2_500_000_000n)).toBe(25_000_000n);
  });
  it("uses the specified recipient wallet", () => { expect(FEE_WALLET).toBe("93bF1K1dWMJseMuf15WLaNt1diVGACQ9gUFA7szsSbs7"); });
  it("truncates sub-micro fees without overcharging", () => { expect(transactionAmounts(0.000066).fee).toBe(0); });
  it("rejects more than six decimals and insufficient funds", () => { expect(validDeposit("1.0000001", 10)).toBe(false); expect(validDeposit("11", 10)).toBe(false); expect(validDeposit("10",10)).toBe(true); });
});
describe("Email consent", () => {
  it("requires explicit consent", () => { expect(emailSignupSchema.safeParse({ email: "a@example.com", consent: false, website: "" }).success).toBe(false); });
  it("rejects honeypot submissions", () => { expect(emailSignupSchema.safeParse({ email: "a@example.com", consent: true, website: "bot" }).success).toBe(false); });
});
import { harvestFee as rebalanceFee } from "@/lib/fees";
describe("rebalance fee", () => {
  it("charges the harvest tier on claimed dollars only: $10 claimed on a $600 position pays 3%", () => {
    expect(rebalanceFee(10_000_000n, 600_000_000n)).toBe(300_000n);
  });
});
