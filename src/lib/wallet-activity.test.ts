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
  const DLMM = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo";
  it("dlmm deposit", () => expect(classifyActivity([...p(DLMM, "Swap2"), "Program log: Instruction: InitializePosition", "Program log: Instruction: AddLiquidityByStrategy2"])).toBe("vault_deposit"));
  it("dlmm exit with conversion is an exit, not a swap", () => expect(classifyActivity([...p("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", "SetTokenLedger"), ...p(DLMM, "RemoveLiquidityByRange2"), "Program log: Instruction: ClaimFee2", "Program log: Instruction: ClosePositionIfEmpty"])).toBe("vault_exit"));
  it("dlmm harvest", () => expect(classifyActivity(p(DLMM, "ClaimFee2"))).toBe("vault_harvest"));
  it("dlmm rebalance", () => expect(classifyActivity([...p(DLMM, "RemoveLiquidityByRange2"), "Program log: Instruction: AddLiquidityByStrategy2"])).toBe("vault_rebalance"));
  it("token transfer without instruction logs", () => expect(classifyActivity(["Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL invoke [1]", "Program log: CreateIdempotent", "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]"])).toBe("transfer"));
});
