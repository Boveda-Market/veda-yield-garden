import { Buffer } from "buffer";
import { z } from "zod";
import { PublicKey, TransactionInstruction, type AddressLookupTableAccount, type Connection } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, createCloseAccountInstruction } from "@solana/spl-token";
import { USDC_MINT, solanaAddressSchema } from "@/lib/solana-data";

const ixSchema = z.object({ programId: solanaAddressSchema, accounts: z.array(z.object({ pubkey: solanaAddressSchema, isSigner: z.boolean(), isWritable: z.boolean() })), data: z.string().max(20_000) });
const swapSchema = z.object({ setupInstructions: z.array(ixSchema), otherInstructions: z.array(ixSchema).optional(), tokenLedgerInstruction: ixSchema.optional(), swapInstruction: ixSchema, cleanupInstruction: ixSchema.nullable().optional(), addressLookupTableAddresses: z.array(solanaAddressSchema).max(16) });
const quoteSchema = z.object({ inputMint: z.string(), outputMint: z.string(), inAmount: z.string().regex(/^\d+$/), otherAmountThreshold: z.string().regex(/^\d+$/), swapMode: z.literal("ExactIn"), routePlan: z.array(z.object({ swapInfo: z.object({ ammKey: z.string() }).passthrough() }).passthrough()) }).passthrough();
const JUPITER = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

async function request(path: string, body?: unknown) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`https://api.jup.ag/swap/v1/${path}`, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20_000) });
    if (response.status === 429 && attempt < 5) { await new Promise((resolve) => setTimeout(resolve, 1_200 * (attempt + 1))); continue; }
    if (!response.ok) throw new Error("Jupiter no disponible");
    return response.json();
  }
}

/** Token account a multi-hop route creates for an intermediate token (e.g. wrapped SOL). */
export type Intermediate = { ata: PublicKey; program: PublicKey };
export type LedgerSwap = { ok: true; setup: TransactionInstruction[]; ledger: TransactionInstruction; route: TransactionInstruction; minimumSwap: bigint; tables: AddressLookupTableAccount[]; intermediates: Intermediate[] } | { ok: false; message: string };

/** Intermediates that do not exist yet: the route would create them and leave their rent behind. */
export async function freshIntermediates(connection: Connection, list: Intermediate[]): Promise<Intermediate[]> {
  if (list.length === 0) return [];
  const infos = await connection.getMultipleAccountsInfo(list.map((e) => e.ata));
  return list.filter((_, i) => !infos[i]);
}

/** Close newly created, emptied intermediates in the same transaction so their rent returns to the owner. */
export const closeIntermediates = (fresh: Intermediate[], owner: PublicKey) => fresh.map((e) => createCloseAccountInstruction(e.ata, owner, owner, [], e.program));

/**
 * Delta-only conversion of a token released earlier in the same transaction into USDC.
 * The quote covers only the protected minimum input; the token ledger swaps the actual delta and
 * the route enforces the exact quoted minimum with zero further slippage. `pool` is the vault's own
 * pool: routes through it are rejected unless `allowPool` (the liquidity removal precedes the swap).
 */
async function buildLedgerSwap(connection: Connection, args: { owner: PublicKey; inputMint: string; inputAta: PublicKey; usdcAta: PublicKey; minimumIn: bigint; pool: string; allowPool?: boolean }, path: { direct: boolean; maxAccounts: number }): Promise<LedgerSwap> {
  const { owner, inputMint, inputAta, usdcAta, minimumIn, pool } = args;
  const usdc = new PublicKey(USDC_MINT);
  if (minimumIn <= 0n) return { ok: false, message: "El retiro no permite proteger un mínimo positivo para la conversión." };
  const params = new URLSearchParams({ inputMint, outputMint: USDC_MINT, amount: minimumIn.toString(), slippageBps: "50", maxAccounts: String(path.maxAccounts), ...(path.direct ? { onlyDirectRoutes: "true" } : {}), ...(args.allowPool ? {} : { excludeDexes: "Meteora,Meteora DLMM,Meteora DAMM v2" }) });
  const jQuote = quoteSchema.parse(await request(`quote?${params}`));
  if (jQuote.inputMint !== inputMint || jQuote.outputMint !== USDC_MINT || jQuote.inAmount !== minimumIn.toString() || (!args.allowPool && jQuote.routePlan.some((r) => r.swapInfo.ammKey === pool))) return { ok: false, message: "La conversión no coincide con los fondos retirados." };
  const minimumSwap = BigInt(jQuote.otherAmountThreshold);
  const swap = swapSchema.parse(await request("swap-instructions", { quoteResponse: jQuote, userPublicKey: owner.toBase58(), wrapAndUnwrapSol: false, dynamicComputeUnitLimit: false, useTokenLedger: true, useSharedAccounts: false }));
  const decode = (ix: z.infer<typeof ixSchema>) => new TransactionInstruction({ programId: new PublicKey(ix.programId), keys: ix.accounts.map((a) => ({ ...a, pubkey: new PublicKey(a.pubkey) })), data: Buffer.from(ix.data, "base64") });
  if (swap.cleanupInstruction) return { ok: false, message: "La ruta necesita un cierre de cuenta adicional que todavía no está validado." };
  if (!swap.tokenLedgerInstruction) return { ok: false, message: "Jupiter no proporcionó el registro de saldo necesario para no consumir tokens previos." };
  const ledger = decode(swap.tokenLedgerInstruction), route = decode(swap.swapInstruction);
  if (!ledger.programId.equals(JUPITER) || !ledger.data.equals(Buffer.from([228, 85, 185, 112, 78, 79, 77, 2])) || !ledger.keys[1]?.pubkey.equals(inputAta) || !route.programId.equals(JUPITER) || !route.data.subarray(0, 8).equals(Buffer.from([150, 86, 71, 116, 167, 93, 14, 104])) || !route.keys[1]?.pubkey.equals(owner) || !route.keys[2]?.pubkey.equals(inputAta) || !route.keys[3]?.pubkey.equals(usdcAta) || !route.keys[5]?.pubkey.equals(usdc) || !route.keys[7]?.pubkey.equals(ledger.keys[0]?.pubkey ?? PublicKey.default) || route.data.length < 23) return { ok: false, message: "El registro de saldo o la ruta Jupiter no coincide con el retiro autorizado." };
  // Borsh route_with_token_ledger ends in quoted_out_amount:u64,
  // slippage_bps:u16, platform_fee_bps:u8. Enforce the exact quote minimum
  // with zero additional slippage rather than discounting the minimum twice.
  if (route.data[route.data.length - 1] !== 0) return { ok: false, message: "La ruta incluye una comisión adicional no autorizada." };
  route.data.writeBigUInt64LE(minimumSwap, route.data.length - 11);
  route.data.writeUInt16LE(0, route.data.length - 3);
  if ((swap.otherInstructions ?? []).length > 0) return { ok: false, message: "La ruta incluye instrucciones adicionales no verificadas." };
  const setup = swap.setupInstructions.map(decode);
  if (setup.some((ix) => !ix.programId.equals(ATA_PROGRAM) || ix.data.length !== 1 || ix.data[0] !== 1 || !ix.keys[0]?.pubkey.equals(owner))) return { ok: false, message: "La preparación Jupiter contiene movimientos adicionales no autorizados." };
  const intermediates: Intermediate[] = [];
  for (const ix of setup) {
    const ata = ix.keys[1]?.pubkey, program = ix.keys[5]?.pubkey;
    if (!ata || !program || (!program.equals(TOKEN_PROGRAM_ID) && !program.equals(TOKEN_2022_PROGRAM_ID))) return { ok: false, message: "La preparación Jupiter contiene cuentas no validadas." };
    if (!ata.equals(inputAta) && !ata.equals(usdcAta) && !intermediates.some((e) => e.ata.equals(ata))) intermediates.push({ ata, program });
  }
  const tables: AddressLookupTableAccount[] = [];
  const loaded = await Promise.all(swap.addressLookupTableAddresses.map((address) => connection.getAddressLookupTable(new PublicKey(address))));
  for (const table of loaded) {
    if (!table.value) return { ok: false, message: "Tabla de direcciones no disponible." };
    tables.push(table.value);
  }
  return { ok: true, setup, ledger, route, minimumSwap, tables, intermediates };
}

type LedgerSwapOk = Extract<LedgerSwap, { ok: true }>;
/**
 * Direct routes first; tokens like GTA6/DCTY only have multi-hop routes. Multi-hop routes are tried
 * from wider to tighter account caps until `fits` confirms the complete transaction stays within one
 * signature-sized message. Every candidate is still simulated and minimum-enforced by the caller.
 */
export async function ledgerSwapToUsdc(connection: Connection, args: { owner: PublicKey; inputMint: string; inputAta: PublicKey; usdcAta: PublicKey; minimumIn: bigint; pool: string; allowPool?: boolean ; fits?: (swap: LedgerSwapOk) => Promise<boolean> }): Promise<LedgerSwap> {
  const paths = [{ direct: true, maxAccounts: 24 }, { direct: false, maxAccounts: 40 }, { direct: false, maxAccounts: 32 }, { direct: false, maxAccounts: 28 }];
  let fallback: LedgerSwap | undefined;
  for (const path of paths) {
    let swap: LedgerSwap;
    try { swap = await buildLedgerSwap(connection, args, path); } catch { continue; }
    if (!swap.ok) { fallback ??= swap; continue; }
    if (!args.fits || await args.fits(swap).catch(() => false)) return swap;
    fallback = swap;
  }
  return fallback ?? { ok: false, message: "No se encontró una ruta de conversión a dólares para este retiro." };
}
