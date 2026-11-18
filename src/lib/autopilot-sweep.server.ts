import type { Connection } from "@solana/web3.js";
import { AUTOPILOT_SWEEP_PROGRAMS, onlyAllowedPrograms, sweepCandidates, sweepWorthIt } from "@/lib/autopilot";
import { privyWalletRpc } from "@/lib/privy-signer";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

/**
 * Before an Autopilot rebalance: convert verified leftover tokens (≥ $1, never USDC/SOL/JupUSD/the vault token) to USDC
 * inside the user's own wallet, one simulated Jupiter swap each, signed by the Autopilot signer. Returns the USDC
 * (micro) that confirmed, which the rebalance then folds into the vault. Every failure is skipped silently.
 */
export async function autopilotSweep(connection: Connection, opts: { wallet: string; walletId: string; vaultMint: string; appSecret: string; seed: string }): Promise<bigint> {
  const { PublicKey, VersionedTransaction } = await import("@solana/web3.js");
  const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const { SWAP_TOKENS } = await import("@/lib/wallet-actions");
  const owner = new PublicKey(opts.wallet);
  const usdcAta = getAssociatedTokenAddressSync(new PublicKey(USDC), owner);
  const accounts = await connection.getParsedTokenAccountsByOwner(owner, { programId: new PublicKey(TOKEN) }).catch(() => null);
  if (!accounts) return 0n;
  const held = new Map<string, bigint>();
  for (const a of accounts.value) {
    const info = (a.account.data as { parsed?: { info?: { mint?: string; tokenAmount?: { amount?: string } } } }).parsed?.info;
    if (info?.mint && info.tokenAmount?.amount) held.set(info.mint, (held.get(info.mint) ?? 0n) + BigInt(info.tokenAmount.amount));
  }
  let added = 0n;
  for (const t of sweepCandidates(SWAP_TOKENS, opts.vaultMint)) {
    const amount = held.get(t.mint) ?? 0n;
    if (amount <= 0n) continue;
    try {
      const q = await fetch(`https://lite-api.jup.ag/swap/v1/quote?inputMint=${t.mint}&outputMint=${USDC}&amount=${amount}&slippageBps=100&restrictIntermediateTokens=true`, { signal: AbortSignal.timeout(10_000) });
      if (!q.ok) continue;
      const quote = await q.json() as { otherAmountThreshold?: string; outAmount?: string };
      const minOut = BigInt(quote.otherAmountThreshold ?? "0");
      if (!sweepWorthIt(minOut)) continue;
      const s = await fetch("https://lite-api.jup.ag/swap/v1/swap", { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(15_000), body: JSON.stringify({ quoteResponse: quote, userPublicKey: opts.wallet, wrapAndUnwrapSol: false, dynamicComputeUnitLimit: true, prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 20_000, priorityLevel: "medium" } } }) });
      if (!s.ok) continue;
      const b64 = (await s.json() as { swapTransaction?: string }).swapTransaction;
      if (!b64) continue;
      const tx = VersionedTransaction.deserialize(Buffer.from(b64, "base64"));
      const keys = tx.message.staticAccountKeys.map((k) => k.toBase58());
      const programs = [...new Set(tx.message.compiledInstructions.map((ix) => keys[ix.programIdIndex] ?? ""))];
      if (keys[0] !== opts.wallet || !onlyAllowedPrograms(programs, AUTOPILOT_SWEEP_PROGRAMS)) continue;
      // Simulate: USDC must land in the user's own account for at least the quoted minimum, and SOL may only pay fees.
      const solBefore = await connection.getBalance(owner);
      const usdcBefore = BigInt((await connection.getTokenAccountBalance(usdcAta).catch(() => null))?.value.amount ?? "0");
      const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, accounts: { encoding: "base64", addresses: [usdcAta.toBase58(), opts.wallet] } });
      const after = sim.value.accounts;
      if (sim.value.err || !after?.[0] || !after[1]) continue;
      const raw = Buffer.from(after[0].data[0] ?? "", "base64");
      const usdcAfter = raw.length >= 72 ? raw.readBigUInt64LE(64) : 0n;
      if (usdcAfter - usdcBefore < minOut || solBefore - after[1].lamports > 5_000_000) continue;
      const out = await privyWalletRpc(opts.walletId, { method: "signTransaction", chain_type: "solana", params: { transaction: b64, encoding: "base64" } }, { appSecret: opts.appSecret, seed: opts.seed });
      const signed = out.data?.signed_transaction;
      if (!signed) continue;
      const sig = await connection.sendRawTransaction(Buffer.from(signed, "base64"), { skipPreflight: false, maxRetries: 3 });
      for (let i = 0; i < 16; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const st = (await connection.getSignatureStatuses([sig]).catch(() => null))?.value[0];
        if (st?.err) break;
        if (st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized") { added += minOut; break; }
      }
    } catch { /* skip this token; the rebalance still runs */ }
  }
  return added;
}
