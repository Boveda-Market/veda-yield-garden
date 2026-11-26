// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { Keypair, TransactionMessage, VersionedTransaction, SystemProgram } from "@solana/web3.js";
import { createPluginWallet } from "@/lib/jupiter-plugin";
import type { BovedaSession } from "@/hooks/use-boveda-session";

function fixture() {
  const owner = Keypair.generate();
  const tx = new VersionedTransaction(new TransactionMessage({ payerKey: owner.publicKey, recentBlockhash: Keypair.generate().publicKey.toBase58(),
    instructions: [SystemProgram.transfer({ fromPubkey: owner.publicKey, toPubkey: Keypair.generate().publicKey, lamports: 1 })] }).compileToV0Message());
  const signOnly = vi.fn(async (bytes: Uint8Array) => { const t = VersionedTransaction.deserialize(bytes); t.sign([owner]); return t.serialize(); });
  let session: BovedaSession = { ready: true, authenticated: true, userId: "test", label: "test", walletAddress: owner.publicKey.toBase58(), error: null,
    login: vi.fn(), logout: vi.fn(async () => {}), signAndSend: vi.fn(async () => ""), signOnly, tradeBlock: null };
  const wallet = createPluginWallet(() => session);
  return { tx, wallet, signOnly, session, change: (s: BovedaSession) => { session = s; } };
}
describe("official Jupiter wallet bridge", () => {
  it("does not sign on connection and signs a confirmed transaction only once without broadcasting", async () => {
    const f = fixture(); expect(f.signOnly).not.toHaveBeenCalled();
    const signed = await f.wallet.signTransaction(f.tx);
    expect(f.signOnly).toHaveBeenCalledOnce(); expect(signed.signatures[0]?.some((x) => x !== 0)).toBe(true);
    expect(f.session.signAndSend).not.toHaveBeenCalled();
  });
  it("blocks a read-only wallet before requesting a signature", async () => {
    const f = fixture(); f.change({ ...f.session, tradeBlock: "external" });
    await expect(f.wallet.signTransaction(f.tx)).rejects.toThrow("no puede"); expect(f.signOnly).not.toHaveBeenCalled();
  });
  it("blocks a transaction which does not require the connected owner", async () => {
    const f = fixture(), other = fixture(); await expect(f.wallet.signTransaction(other.tx)).rejects.toThrow("no corresponde"); expect(f.signOnly).not.toHaveBeenCalled();
  });
  it("blocks signing after an account change", async () => {
    const f = fixture(); f.change({ ...f.session, walletAddress: Keypair.generate().publicKey.toBase58() });
    await expect(f.wallet.signTransaction(f.tx)).rejects.toThrow("cuenta cambió"); expect(f.signOnly).not.toHaveBeenCalled();
  });
  it("never provides a generic transaction sender to the plugin", async () => {
    const f = fixture(); await expect(f.wallet.sendTransaction()).rejects.toThrow("confirmaste"); expect(f.session.signAndSend).not.toHaveBeenCalled();
  });
  it("blocks a treasury wallet before requesting a signature", async () => {
    const f = fixture(); f.change({ ...f.session, tradeBlock: "treasury" });
    await expect(f.wallet.signTransaction(f.tx)).rejects.toThrow("no puede"); expect(f.signOnly).not.toHaveBeenCalled();
  });
  it("blocks signing after logout", async () => {
    const f = fixture(); f.change({ ...f.session, authenticated: false });
    await expect(f.wallet.signTransaction(f.tx)).rejects.toThrow("no puede"); expect(f.signOnly).not.toHaveBeenCalled();
  });
  it("rejects a changed message returned by the signer before Jupiter can send it", async () => {
    const f = fixture(), other = fixture(); f.signOnly.mockImplementation(async () => other.tx.serialize());
    await expect(f.wallet.signTransaction(f.tx)).rejects.toThrow("cambió durante"); expect(f.session.signAndSend).not.toHaveBeenCalled();
  });
});