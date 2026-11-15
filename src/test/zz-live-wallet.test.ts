// @vitest-environment node
// TEMPORARY live harness — delete before commit.
import { it, vi } from "vitest";
vi.mock("@/lib/wallet-chain.functions", async () => {
  const web3 = await import("@solana/web3.js");
  const conn = new web3.Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env["HELIUS_API_KEY"]}`, "confirmed");
  return {
    getTxContext: async ({ data }: { data: { lookupTables: string[] } }) => { const { blockhash } = await conn.getLatestBlockhash("confirmed"); const tables = await Promise.all(data.lookupTables.map((a) => conn.getAddressLookupTable(new web3.PublicKey(a)))); return { success: true, data: { blockhash, tables: tables.flatMap((r) => r.value ? [{ key: r.value.key.toBase58(), addresses: r.value.state.addresses.map((x) => x.toBase58()) }] : []) } }; },
    getTokenBalance: async ({ data }: { data: { wallet: string; mint: string } }) => { const r = await conn.getParsedTokenAccountsByOwner(new web3.PublicKey(data.wallet), { mint: new web3.PublicKey(data.mint) }); return { success: true, amount: r.value.reduce((s, a) => s + BigInt(a.account.data.parsed.info.tokenAmount.amount), 0n).toString() }; },
  };
});
it("live", async () => {
  const web3 = await import("@solana/web3.js"); const bs58 = (await import("bs58")).default;
  const raw = process.env["TEST_WALLET_SECRET_KEY"]!.trim();
  const kp = raw.startsWith("[") ? web3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw))) : web3.Keypair.fromSecretKey(bs58.decode(raw));
  const conn = new web3.Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env["HELIUS_API_KEY"]}`, "confirmed");
  const W = await import("@/lib/wallet-actions");
  const [kind, a, b, c] = process.env["LIVE_OP"]!.split(":");
  let bytes: Uint8Array;
  if (kind === "swap") { const q = await W.quoteSwap(a!, b!, BigInt(c!)); console.log("QUOTE", q.from, "->", q.to, "out", q.outAmount, "min", q.minimum, "feeUsdc", q.feeUsdc); bytes = await W.buildSwap(kp.publicKey.toBase58(), q); }
  else if (kind === "send") { bytes = await W.buildTransfer({ from: kp.publicKey.toBase58(), to: b!, asset: a as "SOL" | "USDC", amount: BigInt(c!) }); }
  else throw new Error("op");
  const tx = web3.VersionedTransaction.deserialize(bytes); tx.sign([kp]);
  const sim = await conn.simulateTransaction(tx, { sigVerify: true });
  if (sim.value.err) { console.log("PRESIM FAIL", JSON.stringify(sim.value.err), (sim.value.logs ?? []).slice(-5).join(" | ")); return; }
  const sig = await conn.sendRawTransaction(tx.serialize(), { maxRetries: 5 }); console.log("SENT", sig);
  for (let i = 0; i < 40; i++) { const s = (await conn.getSignatureStatuses([sig])).value[0]; if (s?.confirmationStatus === "confirmed" || s?.confirmationStatus === "finalized") { console.log("CONFIRMED", s.err ? "ERR " + JSON.stringify(s.err) : "OK"); return; } await new Promise((r) => setTimeout(r, 1500)); }
  console.log("NOT CONFIRMED");
}, 120_000);
