import { describe, expect, it } from "vitest";
import { ed25519 } from "@noble/curves/ed25519.js";
import { PROOF_MAX_AGE_MS, proofIsFresh, walletProofMessage } from "@/lib/wallet-proof";

describe("wallet ownership proof", () => {
  const now = Date.parse("2026-11-09T12:00:00Z");
  it("accepts a proof signed within 10 minutes", () => expect(proofIsFresh(new Date(now - PROOF_MAX_AGE_MS + 1000).toISOString(), now)).toBe(true));
  it("rejects a proof older than 10 minutes", () => expect(proofIsFresh(new Date(now - PROOF_MAX_AGE_MS - 1000).toISOString(), now)).toBe(false));
  it("a signature for another account does not verify", () => {
    const priv = ed25519.utils.randomSecretKey();
    const pub = ed25519.getPublicKey(priv);
    const enc = (s: string) => new TextEncoder().encode(s);
    const sig = ed25519.sign(enc(walletProofMessage("did:privy:victim", "W", "t")), priv);
    expect(ed25519.verify(sig, enc(walletProofMessage("did:privy:victim", "W", "t")), pub)).toBe(true);
    expect(ed25519.verify(sig, enc(walletProofMessage("did:privy:attacker", "W", "t")), pub)).toBe(false);
  });
});
