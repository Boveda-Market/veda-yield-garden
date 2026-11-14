import { describe, expect, it } from "vitest";
import { classifyActivity } from "./wallet-activity";

const p = (id: string, ix: string) => [`Program ${id} invoke [1]`, `Program log: Instruction: ${ix}`];
describe("classifyActivity", () => {
  it("claim", () => expect(classifyActivity(p("3ZZuTbwC6aJbvteyVxXUS7gtFYdf7AuXeitx6VyvjvUp", "ClaimPayout2"))).toBe("predict_claim"));
  it("buy", () => expect(classifyActivity(p("3ZZuTbwC6aJbvteyVxXUS7gtFYdf7AuXeitx6VyvjvUp", "FillBuyOrder2"))).toBe("predict_fill"));
  it("order", () => expect(classifyActivity(p("3ZZuTbwC6aJbvteyVxXUS7gtFYdf7AuXeitx6VyvjvUp", "CreateOrder2"))).toBe("predict_buy"));
  it("unfilled", () => expect(classifyActivity([...p("3ZZuTbwC6aJbvteyVxXUS7gtFYdf7AuXeitx6VyvjvUp", "FillBuyOrder2"), "Program log: Order failed: x - 1 contracts"])).toBe("predict_unfilled"));
  it("cancel refund", () => expect(classifyActivity(p("3ZZuTbwC6aJbvteyVxXUS7gtFYdf7AuXeitx6VyvjvUp", "CloseOrder"))).toBe("predict_cancel"));
  it("close", () => expect(classifyActivity(p("3ZZuTbwC6aJbvteyVxXUS7gtFYdf7AuXeitx6VyvjvUp", "ClosePosition"))).toBe("predict_close"));
  it("swap", () => expect(classifyActivity(p("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", "Route"))).toBe("swap"));
  it("deposit", () => expect(classifyActivity(p("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG", "AddLiquidity"))).toBe("vault_deposit"));
});
