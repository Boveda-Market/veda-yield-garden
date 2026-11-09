import { collateralMint, perpCloseFee, PERP_MARKETS, PERP_SLIPPAGE_BPS, type PerpAsset, type PerpPosition, type PerpQuote, type PerpSide } from "@/lib/perps";
import { FEE_USDC_ACCOUNT, USDC_MINT } from "@/lib/wallet-actions";

const API = "https://perps-api.jup.ag/v1";

async function jup<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { "content-type": "application/json", "x-client-name": "boveda" }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error("perps api " + res.status);
  return res.json() as Promise<T>;
}

export async function listPositions(wallet: string): Promise<PerpPosition[]> {
  const r = await jup<{ dataList: PerpPosition[] }>(`/positions?walletAddress=${encodeURIComponent(wallet)}`);
  return r.dataList.filter((p) => p.asset in PERP_MARKETS);
}

type Built = { transaction: string; quote: PerpQuote; feeMicro: string };

/** Rebuilds Jupiter's request, optionally appending the BÓVEDA fee, and requires a clean simulation. */
async function finalize(apiKey: string, wallet: string, base64: string, feeMicro: bigint): Promise<string> {
  const web3 = await import("@solana/web3.js");
  const spl = await import("@solana/spl-token");
  const { heliusConnection } = await import("@/lib/helius.server");
  const connection = heliusConnection(apiKey);
  const owner = new web3.PublicKey(wallet);
  const tx = web3.VersionedTransaction.deserialize(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
  const msg = tx.message;
  // Only the user's wallet may be required to sign, and it must pay network costs.
  if (msg.header.numRequiredSignatures !== 1 || !msg.staticAccountKeys[0]!.equals(owner)) throw new Error("unexpected signers");
  const lookups = "addressTableLookups" in msg ? msg.addressTableLookups : [];
  const alts = (await Promise.all(lookups.map((l) => connection.getAddressLookupTable(l.accountKey)))).map((r) => { if (!r.value) throw new Error("alt"); return r.value; });
  let out: InstanceType<typeof web3.VersionedTransaction> = tx;
  if (feeMicro > 0n) {
    const decoded = web3.TransactionMessage.decompile(msg, { addressLookupTableAccounts: alts });
    const mint = new web3.PublicKey(USDC_MINT);
    decoded.instructions.push(spl.createTransferCheckedInstruction(spl.getAssociatedTokenAddressSync(mint, owner), mint, new web3.PublicKey(FEE_USDC_ACCOUNT), owner, feeMicro, 6));
    const compiled = msg.version === "legacy" ? decoded.compileToLegacyMessage() : decoded.compileToV0Message(alts);
    out = new web3.VersionedTransaction(compiled);
  }
  const bytes = out.serialize();
  if (bytes.length > 1232) throw new Error("too large");
  const sim = await connection.simulateTransaction(out, { sigVerify: false, replaceRecentBlockhash: false, commitment: "confirmed", accounts: { encoding: "base64", addresses: feeMicro > 0n ? [FEE_USDC_ACCOUNT] : [] } });
  if (sim.value.err) { console.error("[perps] sim", JSON.stringify(sim.value.err), sim.value.logs?.slice(-4)); throw new Error("simulation failed"); }
  if (feeMicro > 0n) {
    const before = await connection.getTokenAccountBalance(new web3.PublicKey(FEE_USDC_ACCOUNT), "confirmed");
    const acc = sim.value.accounts?.[0];
    if (!acc) throw new Error("fee account");
    const data = Uint8Array.from(atob((acc.data as string[])[0]!), (c) => c.charCodeAt(0));
    const after = new DataView(data.buffer).getBigUint64(64, true);
    if (after - BigInt(before.value.amount) !== feeMicro) throw new Error("fee delta");
  }
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
}

export async function buildOpen(apiKey: string, i: { wallet: string; asset: PerpAsset; side: PerpSide; amount: bigint; leverage: number }): Promise<Built> {
  const fee = perpOpenFee(i.amount);
  const collateral = i.amount - fee;
  const r = await jup<{ serializedTxBase64: string | null; requireKeeperSignature: boolean; quote: PerpQuote & { collateralLessThanFees: boolean } }>("/positions/increase", {
    method: "POST",
    body: JSON.stringify({ walletAddress: i.wallet, marketMint: PERP_MARKETS[i.asset], collateralMint: collateralMint(i.asset, i.side), inputMint: USDC_MINT, collateralTokenDelta: collateral.toString(), leverage: String(i.leverage), side: i.side, maxSlippageBps: String(PERP_SLIPPAGE_BPS) }),
  });
  if (!r.serializedTxBase64 || r.requireKeeperSignature || r.quote.collateralLessThanFees) throw new Error("not executable");
  const q = r.quote;
  return { transaction: await finalize(apiKey, i.wallet, r.serializedTxBase64, fee), feeMicro: fee.toString(), quote: { entryPriceUsd: q.entryPriceUsd, liquidationPriceUsd: q.liquidationPriceUsd, positionSizeUsd: q.positionSizeUsd, positionCollateralSizeUsd: q.positionCollateralSizeUsd, openFeeUsd: q.openFeeUsd, priceImpactFeeUsd: q.priceImpactFeeUsd, leverage: q.leverage } };
}

/** Close fee: progressive on the current position value, paid from wallet USDC in the same transaction. */
export async function buildClose(apiKey: string, i: { wallet: string; position: string }): Promise<{ transaction: string; feeMicro: string }> {
  const owned = await listPositions(i.wallet);
  const pos = owned.find((p) => p.positionPubkey === i.position);
  if (!pos) throw new Error("not owner");
  const value = Number(pos.valueUsd);
  const fee = Number.isFinite(value) && value > 0 ? perpCloseFee(BigInt(Math.floor(value * 1e6))) : 0n;
  const r = await jup<{ serializedTxBase64: string | null; requireKeeperSignature?: boolean }>("/positions/decrease", {
    method: "POST",
    body: JSON.stringify({ positionPubkey: i.position, entirePosition: true, receiveToken: "USDC", receiveMint: USDC_MINT, desiredMint: USDC_MINT, maxSlippageBps: String(PERP_SLIPPAGE_BPS) }),
  });
  if (!r.serializedTxBase64 || r.requireKeeperSignature) throw new Error("not executable");
  return { transaction: await finalize(apiKey, i.wallet, r.serializedTxBase64, fee), feeMicro: fee.toString() };
}
