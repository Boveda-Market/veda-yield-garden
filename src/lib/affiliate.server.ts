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

/** Confirmed USDC moved from the payout wallet (which must have signed) to `recipient` in this transaction (micro-USDC), or null. */
export async function confirmedPayoutTransfer(apiKey: string, signature: string, payoutWallet: string, recipient: string) {
  const { heliusConnection } = await import("@/lib/solana-read.server");
  const tx = await heliusConnection(apiKey).getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!tx?.meta || tx.meta.err) return null;
  if (!tx.transaction.message.accountKeys.some((k) => k.signer && k.pubkey.toBase58() === payoutWallet)) return null;
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

/** Builds the USDC payout from the payout wallet to `recipient`, with the recipient as fee payer (they pay network costs in their own SOL). Partially signed by the payout wallet, simulated, returned as base64 for the recipient's wallet to co-sign. */
export async function buildAffiliateClaim(apiKey: string, secret: string, payoutWallet: string, recipient: string, amount: bigint) {
  const { PublicKey, TransactionMessage, VersionedTransaction } = await import("@solana/web3.js");
  const { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const { heliusConnection } = await import("@/lib/solana-read.server");
  const kp = await payoutSigner(secret, payoutWallet);
  const conn = heliusConnection(apiKey);
  const to = new PublicKey(recipient);
  const mint = new PublicKey(USDC_MINT.toString());
  const fromAta = getAssociatedTokenAddressSync(mint, kp.publicKey);
  const toAta = getAssociatedTokenAddressSync(mint, to, true);
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({ payerKey: to, recentBlockhash: blockhash, instructions: [
    createAssociatedTokenAccountIdempotentInstruction(to, toAta, to, mint),
    createTransferCheckedInstruction(fromAta, mint, toAta, kp.publicKey, amount, 6),
  ] }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  tx.sign([kp]);
  const sim = await conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: false });
  if (sim.value.err) throw new Error("simulation failed");
  return Buffer.from(tx.serialize()).toString("base64");
}

/**
 * Network-reserve refill: the treasury pays the network fee and sends `lamports` SOL; in the same transaction
 * the user's wallet pays `charge` USDC to the treasury. Pre-signed by the treasury and simulated; the user co-signs.
 */
export async function buildGasRefill(apiKey: string, secret: string, treasury: string, user: string, lamports: bigint, charge: bigint) {
  const { PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } = await import("@solana/web3.js");
  const { createTransferCheckedInstruction, getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const { heliusConnection } = await import("@/lib/solana-read.server");
  const kp = await payoutSigner(secret, treasury);
  const conn = heliusConnection(apiKey);
  const owner = new PublicKey(user);
  const mint = new PublicKey(USDC_MINT.toString());
  const fromAta = getAssociatedTokenAddressSync(mint, owner, true);
  const toAta = getAssociatedTokenAddressSync(mint, kp.publicKey);
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({ payerKey: kp.publicKey, recentBlockhash: blockhash, instructions: [
    createTransferCheckedInstruction(fromAta, mint, toAta, owner, charge, 6),
    SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: owner, lamports: Number(lamports) }),
  ] }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  tx.sign([kp]);
  const sim = await conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: false });
  if (sim.value.err) throw new Error("simulation failed");
  return Buffer.from(tx.serialize()).toString("base64");
}
