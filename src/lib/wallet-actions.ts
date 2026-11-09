import { z } from "zod";
import { CHAIN_POOLS, solanaAddressSchema } from "@/lib/solana-data";

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SOL_MINT = "So11111111111111111111111111111111111111112";
/** SOL kept aside so the wallet can always pay network costs. */
export const SOL_RESERVE_LAMPORTS = 10_000_000n;

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
  const { PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } = await import("@solana/web3.js");
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
  const { blockhash } = await txContext([]);
  const message = new TransactionMessage({ payerKey: owner, recentBlockhash: blockhash, instructions }).compileToV0Message();
  return new VersionedTransaction(message).serialize();
}

export const SWAP_FEE_BPS = 100n;
/** BÓVEDA's existing USDC account for the fee wallet; every swap fee is paid in USDC here. */
export const FEE_USDC_ACCOUNT = "DXbXVtrEEyJ7zuanJNzyyj1D3PQBsUm65hdQ3DHiarQW";

/** 1% swap fee in micro-USDC, floored. */
export function swapFee(usdcUnits: bigint) { return usdcUnits * SWAP_FEE_BPS / 10_000n; }

/** Swappable tokens: USDC plus every vault token validated with `swapDecimals`; new pools appear automatically. */
export type SwapToken = { symbol: string; mint: string; decimals: number };
export const SWAP_TOKENS: SwapToken[] = [
  { symbol: "USDC", mint: USDC_MINT, decimals: 6 },
  ...CHAIN_POOLS.flatMap((p) => "swapDecimals" in p ? [{ symbol: p.symbol, mint: p.mint, decimals: p.swapDecimals }] : []),
];
export function swapToken(symbol: string) {
  const token = SWAP_TOKENS.find((t) => t.symbol === symbol);
  if (!token) throw new Error("Moneda no disponible para cambiar.");
  return token;
}
/** Parses an amount for any swappable token. */
export function toTokenUnits(value: string, symbol: string): bigint | null {
  const d = swapToken(symbol).decimals;
  const v = value.trim().replace(",", ".");
  if (!new RegExp(`^\\d+(\\.\\d{1,${d}})?$`).test(v)) return null;
  const [whole, frac = ""] = v.split(".");
  const units = BigInt(whole ?? "0") * 10n ** BigInt(d) + BigInt(frac.padEnd(d, "0"));
  return units > 0n ? units : null;
}
/** Spendable swap amount; SOL keeps its network reserve. */
export function swapSpendable(balance: bigint, symbol: string) {
  if (symbol !== "SOL") return balance;
  return balance > SOL_RESERVE_LAMPORTS ? balance - SOL_RESERVE_LAMPORTS : 0n;
}

/** Every swap has USDC on one side so the 1% fee is always charged in USDC. */
export type SwapQuote = { from: string; to: string; amount: bigint; outAmount: string; minimum: string | null; feeUsdc: string; usdcValue: string; priceImpactPct: string; raw: unknown };

/** Public Jupiter quote with 0.5% slippage; the 1% fee is always charged in USDC. */
export async function quoteSwap(from: string, to: string, amount: bigint): Promise<SwapQuote> {
  const a = swapToken(from), b = swapToken(to);
  if ((a.symbol === "USDC") === (b.symbol === "USDC")) throw new Error("Cada cambio debe incluir USDC.");
  const buying = a.symbol === "USDC";
  // X→USDC: Jupiter takes 1% of the USDC output. USDC→X: 1% of the USDC input is set aside before swapping.
  const swapIn = buying ? amount - swapFee(amount) : amount;
  const feeParam = buying ? "" : `&platformFeeBps=${SWAP_FEE_BPS}`;
  const res = await fetch(`https://lite-api.jup.ag/swap/v1/quote?inputMint=${a.mint}&outputMint=${b.mint}&amount=${swapIn}&slippageBps=50${feeParam}`);
  if (!res.ok) throw new Error("No se pudo cotizar el cambio. Inténtalo de nuevo.");
  const raw = await res.json() as { outAmount: string; otherAmountThreshold?: string; priceImpactPct: string; platformFee?: { amount: string } };
  if (!/^\d+$/.test(raw.outAmount ?? "")) throw new Error("No se pudo cotizar el cambio. Inténtalo de nuevo.");
  const feeUsdc = buying ? swapFee(amount).toString() : (raw.platformFee?.amount ?? "");
  if (!feeUsdc || BigInt(feeUsdc) <= 0n) throw new Error("El monto es demasiado pequeño para cambiar.");
  const minimum = typeof raw.otherAmountThreshold === "string" && /^\d+$/.test(raw.otherAmountThreshold) ? raw.otherAmountThreshold : null;
  return { from: a.symbol, to: b.symbol, amount, outAmount: raw.outAmount, minimum, feeUsdc, usdcValue: buying ? amount.toString() : raw.outAmount, priceImpactPct: raw.priceImpactPct, raw };
}

/** Classic SPL balance via a narrow server read; zero when the wallet has no account yet. */
export async function readTokenBalance(owner: string, mint: string): Promise<bigint> {
  const { getTokenBalance } = await import("@/lib/wallet-chain.functions");
  const r = await getTokenBalance({ data: { wallet: owner, mint } });
  if (!r.success) throw new Error(r.error);
  return BigInt(r.amount);
}

/** Recent blockhash and lookup tables, read server-side because the public RPC rejects browsers. */
async function txContext(lookupTables: string[]) {
  const { getTxContext } = await import("@/lib/wallet-chain.functions");
  const r = await getTxContext({ data: { lookupTables } });
  if (!r.success) throw new Error(r.error);
  return r.data;
}

type JupIx = { programId: string; accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[]; data: string };

/**
 * Builds the swap with @solana/kit only (no Node Buffer dependency), so it works in every
 * browser bundle. The connected wallet alone signs it.
 */
export async function buildSwap(wallet: string, quote: SwapQuote): Promise<Uint8Array> {
  const kit = await import("@solana/kit");
  const { address, AccountRole, pipe, createTransactionMessage, setTransactionMessageFeePayer, setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstructions, compressTransactionMessageUsingAddressLookupTables, compileTransaction, getTransactionEncoder, getProgramDerivedAddress, getAddressEncoder, blockhash: toBlockhash } = kit;
  const res = await fetch("https://lite-api.jup.ag/swap/v1/swap-instructions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quoteResponse: quote.raw, userPublicKey: wallet, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: { priorityLevelWithMaxLamports: { priorityLevel: "medium", maxLamports: 50_000 } }, ...(quote.to === "USDC" ? { feeAccount: FEE_USDC_ACCOUNT } : {}) }) });
  if (!res.ok) throw new Error("No se pudo preparar el cambio. Inténtalo de nuevo.");
  const j = await res.json() as { computeBudgetInstructions: JupIx[]; setupInstructions: JupIx[]; swapInstruction: JupIx; cleanupInstruction?: JupIx; addressLookupTableAddresses: string[] };
  const role = (s: boolean, w: boolean) => s ? (w ? AccountRole.WRITABLE_SIGNER : AccountRole.READONLY_SIGNER) : (w ? AccountRole.WRITABLE : AccountRole.READONLY);
  const ix = (i: JupIx) => ({ programAddress: address(i.programId), accounts: i.accounts.map((a) => ({ address: address(a.pubkey), role: role(a.isSigner, a.isWritable) })), data: Uint8Array.from(atob(i.data), (c) => c.charCodeAt(0)) });
  const owner = address(wallet);
  const instructions = [...j.computeBudgetInstructions.map(ix), ...j.setupInstructions.map(ix)];
  if (quote.from === "USDC") {
    const enc = getAddressEncoder();
    const mint = address(USDC_MINT), tokenProgram = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const [source] = await getProgramDerivedAddress({ programAddress: address("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"), seeds: [enc.encode(owner), enc.encode(tokenProgram), enc.encode(mint)] });
    // SPL TransferChecked: [12, amount u64 LE, decimals].
    const data = new Uint8Array(10); data[0] = 12; new DataView(data.buffer).setBigUint64(1, BigInt(quote.feeUsdc), true); data[9] = 6;
    instructions.push({ programAddress: tokenProgram, accounts: [{ address: source, role: AccountRole.WRITABLE }, { address: mint, role: AccountRole.READONLY }, { address: address(FEE_USDC_ACCOUNT), role: AccountRole.WRITABLE }, { address: owner, role: AccountRole.READONLY_SIGNER }], data });
  }
  instructions.push(ix(j.swapInstruction));
  if (j.cleanupInstruction) instructions.push(ix(j.cleanupInstruction));
  const ctx = await txContext(j.addressLookupTableAddresses);
  const tables = Object.fromEntries(ctx.tables.map((x) => [address(x.key), x.addresses.map((k) => address(k))]));
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(owner, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash({ blockhash: toBlockhash(ctx.blockhash), lastValidBlockHeight: 0n }, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
    (m) => compressTransactionMessageUsingAddressLookupTables(m, tables),
  );
  const bytes = new Uint8Array(getTransactionEncoder().encode(compileTransaction(message)));
  if (bytes.length > 1232) throw new Error("No se pudo preparar el cambio. Inténtalo con otro monto.");
  return bytes;
}
