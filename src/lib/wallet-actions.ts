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

export type SwapQuote = { outAmount: string; priceImpactPct: string; raw: unknown };

/** Public Jupiter quote with 0.5% slippage protection. */
export async function quoteSwap(asset: WalletAsset, amount: bigint): Promise<SwapQuote> {
  const [input, output] = asset === "SOL" ? [SOL_MINT, USDC_MINT] : [USDC_MINT, SOL_MINT];
  const res = await fetch(`https://lite-api.jup.ag/swap/v1/quote?inputMint=${input}&outputMint=${output}&amount=${amount}&slippageBps=50`);
  if (!res.ok) throw new Error("No se pudo cotizar el cambio. Inténtalo de nuevo.");
  const raw = await res.json() as { outAmount: string; priceImpactPct: string };
  return { outAmount: raw.outAmount, priceImpactPct: raw.priceImpactPct, raw };
}

export async function buildSwap(wallet: string, quote: SwapQuote): Promise<Uint8Array> {
  const res = await fetch("https://lite-api.jup.ag/swap/v1/swap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quoteResponse: quote.raw, userPublicKey: wallet, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true }) });
  if (!res.ok) throw new Error("No se pudo preparar el cambio. Inténtalo de nuevo.");
  const { swapTransaction } = await res.json() as { swapTransaction: string };
  return Uint8Array.from(atob(swapTransaction), (c) => c.charCodeAt(0));
}
