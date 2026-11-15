import { afterEach, describe, expect, it } from "vitest";
import { sessionWalletAddress } from "@/lib/session-wallet";
import { currentPrivyToken, setPrivyTokenGetter } from "@/lib/privy-token";

const OWN = "5WbsuG4T4FrtwYDCB7YWTDxLj47yqAwAJD9o4Rk886nu";

describe("wallet shown right after sign-in", () => {
  it("uses the account's own protected wallet while the signer list is still empty", () => {
    expect(sessionWalletAddress([], true, [{ type: "wallet", chainType: "solana", walletClientType: "privy", address: OWN }])).toBe(OWN);
  });
  it("prefers the signer once it is ready", () => {
    expect(sessionWalletAddress([{ address: "Other1111111111111111111111111111111111111" }], true, [{ type: "wallet", chainType: "solana", walletClientType: "privy", address: OWN }])).toBe("Other1111111111111111111111111111111111111");
  });
  it("never shows a wallet when signed out or for an external-only account", () => {
    expect(sessionWalletAddress([], false, [{ type: "wallet", chainType: "solana", walletClientType: "privy", address: OWN }])).toBeNull();
    expect(sessionWalletAddress([], true, [{ type: "wallet", chainType: "solana", walletClientType: "phantom", address: OWN }])).toBeNull();
  });
});

describe("session token right after sign-in", () => {
  afterEach(() => setPrivyTokenGetter(null));
  it("waits for a token that is briefly unavailable instead of sending the read signed out", async () => {
    let calls = 0;
    setPrivyTokenGetter(async () => (++calls < 3 ? null : "token-ready"));
    expect(await currentPrivyToken([1, 1, 1])).toBe("token-ready");
  });
  it("returns at once when signed out", async () => {
    expect(await currentPrivyToken([1000])).toBeNull();
  });
});
