import { z } from "zod";
import { solanaAddressSchema } from "@/lib/solana-data";

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SOL_MINT = "So11111111111111111111111111111111111111112";
/** SOL kept aside so the wallet can always pay network costs. */
export const SOL_RESERVE_LAMPORTS = 10_000_000n;
const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

export type WalletAsset = "SOL" | "USDC";
const DECIMALS: Record<WalletAsset, number> = { SOL: 9, USDC: 6 };

/** Parses a decimal amount into integer base units; null if invalid or too precise. */
export function toBaseUnits(value: string, asset: WalletAsset): bigint | null {
  const v = value.trim().replace(",", ".");
  const d = DECIMALS[asset];
  if (!new RegExp(`^\\d+(\\.\\d{1,${d}})?$`).test(v)) return null;
  const [whole, frac = ""] = v.split(".");
  const units = BigInt(whole ?? "0") * 10n ** BigInt(d) + BigInt(frac.padEnd(d, "0"));
  return units > 0n ? units : null;
}

/** Maximum spendable amount; SOL keeps a reserve for network costs. */
export function spendable(balance: bigint, asset: WalletAsset) {
  if (asset === "USDC") return balance;
  return balance > SOL_RESERVE_LAMPORTS ? balance - SOL_RESERVE_LAMPORTS : 0n;
}

export const sendInput = z.object({ from: solanaAddressSchema, to: solanaAddressSchema, asset: z.enum(["SOL", "USDC"]), amount: z.bigint().positive() })
  .refine((v) => v.from !== v.to, { message: "La dirección de destino es tu propia wallet." });

/** Builds an unsigned SOL or USDC transfer; the connected wallet signs and sends it. */
export async function buildTransfer(input: z.infer<typeof sendInput>): Promise<Uint8Array> {
  const { from, to, asset, amount } = sendInput.parse(input);
  const { Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } = await import("@solana/web3.js");
  const connection = new Connection(PUBLIC_RPC, "confirmed");
  const owner = new PublicKey(from), dest = new PublicKey(to);
  const instructions = [];
  if (asset === "SOL") instructions.push(SystemProgram.transfer({ fromPubkey: owner, toPubkey: dest, lamports: amount }));
  else {
    const spl = await import("@solana/spl-token");
    const mint = new PublicKey(USDC_MINT);
    const source = spl.getAssociatedTokenAddressSync(mint, owner);
    const target = spl.getAssociatedTokenAddressSync(mint, dest, true);
    instructions.push(spl.createAssociatedTokenAccountIdempotentInstruction(owner, target, dest, mint));
    instructions.push(spl.createTransferCheckedInstruction(source, mint, target, owner, amount, 6));
  }
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({ payerKey: owner, recentBlockhash: blockhash, instructions }).compileToV0Message();
  return new VersionedTransaction(message).serialize();
}

export const SWAP_FEE_BPS = 100n;
/** BÓVEDA's existing USDC account for the fee wallet; every swap fee is paid in USDC here. */
export const FEE_USDC_ACCOUNT = "DXbXVtrEEyJ7zuanJNzyyj1D3PQBsUm65hdQ3DHiarQW";

/** 1% swap fee in micro-USDC, floored. */
export function swapFee(usdcUnits: bigint) { return usdcUnits * SWAP_FEE_BPS / 10_000n; }

export type SwapQuote = { asset: WalletAsset; amount: bigint; outAmount: string; feeUsdc: string; priceImpactPct: string; raw: unknown };

/** Public Jupiter quote with 0.5% slippage; the 1% fee is always charged in USDC. */
export async function quoteSwap(asset: WalletAsset, amount: bigint): Promise<SwapQuote> {
  const [input, output] = asset === "SOL" ? [SOL_MINT, USDC_MINT] : [USDC_MINT, SOL_MINT];
  // SOL→USDC: Jupiter takes 1% of the USDC output. USDC→SOL: 1% of the USDC input is set aside before swapping.
  const swapIn = asset === "USDC" ? amount - swapFee(amount) : amount;
  const feeParam = asset === "SOL" ? `&platformFeeBps=${SWAP_FEE_BPS}` : "";
  const res = await fetch(`https://lite-api.jup.ag/swap/v1/quote?inputMint=${input}&outputMint=${output}&amount=${swapIn}&slippageBps=50${feeParam}`);
  if (!res.ok) throw new Error("No se pudo cotizar el cambio. Inténtalo de nuevo.");
  const raw = await res.json() as { outAmount: string; priceImpactPct: string; platformFee?: { amount: string } };
  const feeUsdc = asset === "SOL" ? (raw.platformFee?.amount ?? "") : swapFee(amount).toString();
  if (!feeUsdc || BigInt(feeUsdc) <= 0n) throw new Error("El monto es demasiado pequeño para cambiar.");
  return { asset, amount, outAmount: raw.outAmount, feeUsdc, priceImpactPct: raw.priceImpactPct, raw };
}

type JupIx = { programId: string; accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[]; data: string };

export async function buildSwap(wallet: string, quote: SwapQuote): Promise<Uint8Array> {
  const { Connection, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } = await import("@solana/web3.js");
  const res = await fetch("https://lite-api.jup.ag/swap/v1/swap-instructions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quoteResponse: quote.raw, userPublicKey: wallet, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: { priorityLevelWithMaxLamports: { priorityLevel: "medium", maxLamports: 50_000 } }, ...(quote.asset === "SOL" ? { feeAccount: FEE_USDC_ACCOUNT } : {}) }) });
  if (!res.ok) throw new Error("No se pudo preparar el cambio. Inténtalo de nuevo.");
  const j = await res.json() as { computeBudgetInstructions: JupIx[]; setupInstructions: JupIx[]; swapInstruction: JupIx; cleanupInstruction?: JupIx; addressLookupTableAddresses: string[] };
  const ix = (i: JupIx) => new TransactionInstruction({ programId: new PublicKey(i.programId), keys: i.accounts.map((a) => ({ pubkey: new PublicKey(a.pubkey), isSigner: a.isSigner, isWritable: a.isWritable })), data: Uint8Array.from(atob(i.data), (c) => c.charCodeAt(0)) as Buffer });
  const owner = new PublicKey(wallet);
  const instructions = [...j.computeBudgetInstructions.map(ix), ...j.setupInstructions.map(ix)];
  if (quote.asset === "USDC") {
    const spl = await import("@solana/spl-token");
    const mint = new PublicKey(USDC_MINT);
    instructions.push(spl.createTransferCheckedInstruction(spl.getAssociatedTokenAddressSync(mint, owner), mint, new PublicKey(FEE_USDC_ACCOUNT), owner, BigInt(quote.feeUsdc), 6));
  }
  instructions.push(ix(j.swapInstruction));
  if (j.cleanupInstruction) instructions.push(ix(j.cleanupInstruction));
  const connection = new Connection(PUBLIC_RPC, "confirmed");
  const alts = (await Promise.all(j.addressLookupTableAddresses.map((a) => connection.getAddressLookupTable(new PublicKey(a))))).flatMap((r) => r.value ? [r.value] : []);
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const tx = new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: blockhash, instructions }).compileToV0Message(alts));
  const bytes = tx.serialize();
  if (bytes.length > 1232) throw new Error("No se pudo preparar el cambio. Inténtalo con otro monto.");
  return bytes;
}
