import { describe, expect, it } from "vitest";
import { DEPOSIT_FEE_PERCENT, FEE_PERCENT, FEE_WALLET, transactionAmounts, validDeposit } from "@/lib/fees";
import { emailSignupSchema } from "@/lib/email-signup";
describe("Operational USDC fee", () => {
  it("charges 0% on entry leaving all 100 USDC invested", () => { expect(DEPOSIT_FEE_PERCENT).toBe(0); expect(transactionAmounts(100, "deposit")).toEqual({ gross: 100, fee: 0, net: 100 }); });
  it("charges 1% only on the harvested earnings", () => { expect(transactionAmounts(10)).toEqual({ gross: 10, fee: 0.1, net: 9.9 }); });
  it("charges 1% on full liquidation proceeds", () => { expect(FEE_PERCENT).toBe(1); expect(transactionAmounts(110)).toEqual({ gross: 110, fee: 1.1, net: 108.9 }); });
  it("uses the specified recipient wallet", () => { expect(FEE_WALLET).toBe("93bF1K1dWMJseMuf15WLaNt1diVGACQ9gUFA7szsSbs7"); });
  it("truncates sub-micro fees without overcharging", () => { expect(transactionAmounts(0.000199)).toEqual({ gross: 0.000199, fee: 0.000001, net: 0.000198 }); });
  it("rejects more than six decimals and insufficient funds", () => { expect(validDeposit("1.0000001", 10)).toBe(false); expect(validDeposit("11", 10)).toBe(false); expect(validDeposit("10",10)).toBe(true); });
});
describe("Email consent", () => {
  it("requires explicit consent", () => { expect(emailSignupSchema.safeParse({ email: "a@example.com", consent: false, website: "" }).success).toBe(false); });
  it("rejects honeypot submissions", () => { expect(emailSignupSchema.safeParse({ email: "a@example.com", consent: true, website: "bot" }).success).toBe(false); });
});