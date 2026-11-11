import { FEE_WALLET } from "@/lib/fees";
import { USDC_MINT } from "@/lib/solana-data";

/** Reads a confirmed transaction and returns its fee payer and the USDC credited to BÓVEDA's fee wallet. */
export async function confirmedFeeTransfer(apiKey: string, signature: string) {
  const { heliusConnection } = await import("@/lib/solana-read.server");
  const tx = await heliusConnection(apiKey).getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!tx?.meta || tx.meta.err) return null;
  const payer = tx.transaction.message.accountKeys[0]?.pubkey.toBase58();
  if (!payer) return null;
  const mint = USDC_MINT.toString();
  const sum = (list: typeof tx.meta.preTokenBalances) => (list ?? [])
    .filter((b) => b.owner === FEE_WALLET && b.mint === mint)
    .reduce((acc, b) => acc + BigInt(b.uiTokenAmount.amount), 0n);
  const feeRaw = sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances);
  return { payer, feeRaw };
}

/** Confirmed USDC moved from the payout wallet to `recipient` in this transaction (micro-USDC), or null. */
export async function confirmedPayoutTransfer(apiKey: string, signature: string, payoutWallet: string, recipient: string) {
  const { heliusConnection } = await import("@/lib/solana-read.server");
  const tx = await heliusConnection(apiKey).getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!tx?.meta || tx.meta.err) return null;
  if (tx.transaction.message.accountKeys[0]?.pubkey.toBase58() !== payoutWallet) return null;
  const mint = USDC_MINT.toString();
  const sum = (owner: string, list: typeof tx.meta.preTokenBalances) => (list ?? []).filter((b) => b.owner === owner && b.mint === mint).reduce((a, b) => a + BigInt(b.uiTokenAmount.amount), 0n);
  const received = sum(recipient, tx.meta.postTokenBalances) - sum(recipient, tx.meta.preTokenBalances);
  return received > 0n ? received : null;
}

/** Decodes the payout wallet secret (base58 or JSON byte array) and checks it matches the expected public key. */
async function payoutSigner(secret: string, expected: string) {
  const { Keypair } = await import("@solana/web3.js");
  const bs58 = (await import("bs58")).default;
  const s = secret.trim();
  const bytes = s.startsWith("[") ? Uint8Array.from(JSON.parse(s) as number[]) : bs58.decode(s);
  const kp = Keypair.fromSecretKey(bytes);
  if (kp.publicKey.toBase58() !== expected) throw new Error("payout key mismatch");
  return kp;
}

/** Sends `amount` micro-USDC from the payout wallet to `recipient` (creating its USDC account if missing) and returns the confirmed signature. */
export async function sendAffiliateClaim(apiKey: string, secret: string, payoutWallet: string, recipient: string, amount: bigint) {
  const { PublicKey, Transaction } = await import("@solana/web3.js");
  const { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const { heliusConnection } = await import("@/lib/solana-read.server");
  const kp = await payoutSigner(secret, payoutWallet);
  const conn = heliusConnection(apiKey);
  const to = new PublicKey(recipient);
  const mint = new PublicKey(USDC_MINT.toString());
  const fromAta = getAssociatedTokenAddressSync(mint, kp.publicKey);
  const toAta = getAssociatedTokenAddressSync(mint, to, true);
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: kp.publicKey, blockhash, lastValidBlockHeight }).add(
    createAssociatedTokenAccountIdempotentInstruction(kp.publicKey, toAta, to, mint),
    createTransferCheckedInstruction(fromAta, mint, toAta, kp.publicKey, amount, 6),
  );
  tx.sign(kp);
  const sim = await conn.simulateTransaction(tx);
  if (sim.value.err) throw new Error("simulation failed");
  const signature = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  const res = await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  if (res.value.err) throw new Error("tx failed");
  return signature;
}
