import { FEE_WALLET } from "@/lib/fees";
import { decideTopup } from "@/lib/treasury-topup";

const SOL = "So11111111111111111111111111111111111111112", USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

async function treasurySigner(secret: string) {
  const { Keypair } = await import("@solana/web3.js");
  const bs58 = (await import("bs58")).default;
  const s = secret.trim();
  const kp = Keypair.fromSecretKey(s.startsWith("[") ? Uint8Array.from(JSON.parse(s) as number[]) : bs58.decode(s));
  if (kp.publicKey.toBase58() !== FEE_WALLET) throw new Error("treasury key mismatch");
  return kp;
}

/** Reads treasury SOL, USDC and pending affiliate commissions (never spent). */
export async function treasuryBalances(apiKey: string) {
  const { PublicKey } = await import("@solana/web3.js");
  const { heliusConnection } = await import("@/lib/solana-read.server");
  const conn = heliusConnection(apiKey), owner = new PublicKey(FEE_WALLET);
  const sol = BigInt(await conn.getBalance(owner, "confirmed"));
  const accts = await conn.getParsedTokenAccountsByOwner(owner, { mint: new PublicKey(USDC) }, "confirmed");
  const usdcMicro = accts.value.reduce((a, x) => a + BigInt((x.account.data.parsed as { info: { tokenAmount: { amount: string } } }).info.tokenAmount.amount), 0n);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as { from: (t: string) => any };
  const { data, error } = await db.from("affiliate_earnings").select("commission_raw").eq("status", "pending").limit(10000);
  if (error) throw new Error("pending read failed");
  const pendingMicro = ((data ?? []) as { commission_raw: string }[]).reduce((a, r) => a + BigInt(r.commission_raw), 0n);
  return { sol, usdcMicro, pendingMicro };
}

/** Swaps `amountMicro` treasury dollars into network reserve, signed only by the treasury; simulated first, confirmed after. */
export async function swapTreasuryToSol(apiKey: string, secret: string, amountMicro: bigint) {
  const { VersionedTransaction } = await import("@solana/web3.js");
  const { heliusConnection } = await import("@/lib/solana-read.server");
  const kp = await treasurySigner(secret);
  const conn = heliusConnection(apiKey);
  const q = await fetch(`https://lite-api.jup.ag/swap/v1/quote?inputMint=${USDC}&outputMint=${SOL}&amount=${amountMicro}&slippageBps=100&restrictIntermediateTokens=true`);
  if (!q.ok) throw new Error("quote");
  const quote = (await q.json()) as { outAmount: string };
  const s = await fetch("https://lite-api.jup.ag/swap/v1/swap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quoteResponse: quote, userPublicKey: FEE_WALLET, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 20_000, priorityLevel: "medium" } } }) });
  if (!s.ok) throw new Error("swap build");
  const tx = VersionedTransaction.deserialize(Buffer.from(((await s.json()) as { swapTransaction: string }).swapTransaction, "base64"));
  tx.sign([kp]);
  const sim = await conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
  if (sim.value.err) throw new Error("simulation failed");
  const signature = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: true, maxRetries: 5 });
  // Poll status instead of a single websocket confirm: slow RPC acks must not hide a swap that landed.
  for (let i = 0; i < 30; i++) {
    const st = (await conn.getSignatureStatuses([signature], { searchTransactionHistory: true })).value[0];
    if (st?.err) throw new Error("swap failed on chain");
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) return { signature, expectedLamports: BigInt(quote.outAmount) };
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("swap unconfirmed");
}

/** Runs one refill decision end to end. Returns what happened; never throws. */
export async function runTreasuryTopup(opts: { lastAt: number | null; manual?: boolean }) {
  const key = process.env["HELIUS_API_KEY"], secret = process.env["AFFILIATE_PAYOUT_SECRET_KEY"];
  if (!key || !secret) return { done: false as const, reason: "config" };
  try {
    const b = await treasuryBalances(key);
    const d = decideTopup({ ...b, lastAt: opts.lastAt, now: Date.now(), manual: opts.manual ?? false });
    if (d.kind === "skip") return { done: false as const, reason: d.reason, sol: b.sol };
    const r = await swapTreasuryToSol(key, secret, d.amountMicro);
    let solAfter = b.sol + r.expectedLamports;
    try { solAfter = (await treasuryBalances(key)).sol; } catch { /* keep estimate */ }
    return { done: true as const, amountMicro: d.amountMicro, signature: r.signature, receivedLamports: solAfter > b.sol ? solAfter - b.sol : r.expectedLamports, solBefore: b.sol, solAfter, usdcBefore: b.usdcMicro, pendingMicro: b.pendingMicro };
  } catch (e) {
    console.error("treasury topup failed", e instanceof Error ? e.message : "unknown");
    return { done: false as const, reason: "error" };
  }
}
