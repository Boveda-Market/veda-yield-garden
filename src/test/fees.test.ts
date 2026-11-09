import { describe, expect, it } from "vitest";
import { DEPOSIT_FEE_PERCENT, FEE_PERCENT, FEE_WALLET, transactionAmounts, validDeposit } from "@/lib/fees";
import { emailSignupSchema } from "@/lib/email-signup";
describe("Operational USDC fee", () => {
  it("charges 0.5% on entry above 5 USDC", () => { expect(transactionAmounts(100, "deposit")).toEqual({ gross: 100, fee: 0.475, net: 99.525 }); expect(transactionAmounts(5, "deposit").fee).toBe(0); });
  it("charges nothing on exits up to 10 USDC", () => { expect(transactionAmounts(10)).toEqual({ gross: 10, fee: 0, net: 10 }); });
  it("charges 1% on full liquidation proceeds", () => { expect(FEE_PERCENT).toBe(1); expect(transactionAmounts(110)).toEqual({ gross: 110, fee: 1.25, net: 108.75 }); });
  it("uses the specified recipient wallet", () => { expect(FEE_WALLET).toBe("93bF1K1dWMJseMuf15WLaNt1diVGACQ9gUFA7szsSbs7"); });
  it("truncates sub-micro fees without overcharging", () => { expect(transactionAmounts(10.000079)).toEqual({ gross: 10.000079, fee: 0, net: 10.000079 }); });
  it("rejects more than six decimals and insufficient funds", () => { expect(validDeposit("1.0000001", 10)).toBe(false); expect(validDeposit("11", 10)).toBe(false); expect(validDeposit("10",10)).toBe(true); });
});
describe("Email consent", () => {
  it("requires explicit consent", () => { expect(emailSignupSchema.safeParse({ email: "a@example.com", consent: false, website: "" }).success).toBe(false); });
  it("rejects honeypot submissions", () => { expect(emailSignupSchema.safeParse({ email: "a@example.com", consent: true, website: "bot" }).success).toBe(false); });
});