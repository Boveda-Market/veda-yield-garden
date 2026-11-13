import { describe, expect, it } from "vitest";
import { tradeBlockReason } from "@/lib/trade-guard";

const T = "93bF1K1dWMJseMuf15WLaNt1diVGACQ9gUFA7szsSbs7", W = "5WbsuG4T4FrtwYDCB7YWTDxLj47yqAwAJD9o4Rk886nu";
describe("trade guard", () => {
  it("allows the caller's own Privy embedded wallet", () => {
    expect(tradeBlockReason(W, T, [{ type: "wallet", address: W, chain_type: "solana", wallet_client_type: "privy", connector_type: "embedded" }])).toBeNull();
  });
  it("blocks external wallets such as Phantom (view-only)", () => {
    expect(tradeBlockReason(W, T, [{ type: "wallet", address: W, chain_type: "solana", wallet_client_type: "phantom", connector_type: "solana_adapter" }])).toBe("external");
  });
  it("blocks the treasury wallet even if embedded", () => {
    expect(tradeBlockReason(T, T, [{ type: "wallet", address: T, chain_type: "solana", wallet_client_type: "privy" }])).toBe("treasury");
  });
  it("blocks a wallet not linked to the caller", () => {
    expect(tradeBlockReason(W, T, [])).toBe("not_owner");
  });
});
