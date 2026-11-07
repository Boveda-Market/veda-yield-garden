import BN from "bn.js";
import { Buffer } from "buffer";
import { z } from "zod";
import { ComputeBudgetProgram, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { CpAmm } from "@meteora-ag/cp-amm-sdk";
import { heliusConnection } from "@/lib/solana-read.server";
import { CHAIN_POOLS, USDC_MINT, tokenAmount, solanaAddressSchema } from "@/lib/solana-data";
import { FEE_WALLET } from "@/lib/fees";
import { compactDepositInstructions } from "@/lib/compact-deposit";
import { withdrawalAmounts, type WithdrawalInput, type WithdrawalResult } from "@/lib/withdrawal";

const ixSchema = z.object({ programId: solanaAddressSchema, accounts: z.array(z.object({ pubkey: solanaAddressSchema, isSigner: z.boolean(), isWritable: z.boolean() })), data: z.string().max(20_000) });
const swapSchema = z.object({ setupInstructions: z.array(ixSchema), otherInstructions: z.array(ixSchema).optional(), swapInstruction: ixSchema, cleanupInstruction: ixSchema.nullable().optional(), addressLookupTableAddresses: z.array(solanaAddressSchema).max(16) });
const quoteSchema = z.object({ inputMint: z.string(), outputMint: z.string(), inAmount: z.string().regex(/^\d+$/), otherAmountThreshold: z.string().regex(/^\d+$/), swapMode: z.literal("ExactIn"), routePlan: z.array(z.object({ swapInfo: z.object({ ammKey: z.string() }) })) }).passthrough();

/** Diagnostic only. Unknown realized swap proceeds cannot be charged by a fixed SPL transfer safely. */
export async function simulateWithdrawal(apiKey: string, input: WithdrawalInput): Promise<WithdrawalResult> {
  const fail = (message: string, bytes?: number): WithdrawalResult => ({ success: false, sent: false, message, ...(bytes === undefined ? {} : { bytes }) });
  try {
    const connection = heliusConnection(apiKey);
    if (await connection.getGenesisHash() !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d") return fail("La conexión no corresponde a Solana Mainnet.");
    const config = CHAIN_POOLS.find((p) => p.id === input.vaultId);
    if (!config) return fail("Bóveda no válida.");
    const owner = new PublicKey(input.wallet), position = new PublicKey(input.position), usdc = new PublicKey(USDC_MINT);
    const cp = new CpAmm(connection);
    const owned = (await cp.getPositionsByUser(owner)).find((p) => p.position.equals(position));
    if (!owned || owned.positionState.pool.toBase58() !== config.pool) return fail("La posición no pertenece a esta wallet y bóveda.");
    const state = owned.positionState, pool = await cp.fetchPoolState(state.pool);
    if (!pool.tokenAMint.equals(new PublicKey(config.mint)) || !pool.tokenBMint.equals(usdc) || pool.tokenAFlag !== 0 || pool.tokenBFlag !== 0) return fail("Los tokens o programas de este pool no están validados.");
    if (!state.vestedLiquidity.isZero() || !state.permanentLockedLiquidity.isZero()) return fail("La posición tiene liquidez bloqueada; no se cerrará ni se prometerá recuperar su renta.");
    if (pool.rewardInfos.some((r) => r.initialized)) return fail("Esta posición requiere validar recompensas adicionales antes de liquidarla por completo.");
    const source = getAssociatedTokenAddressSync(usdc, owner), tokenA = getAssociatedTokenAddressSync(pool.tokenAMint, owner);
    const feeOwner = new PublicKey(FEE_WALLET), recipient = getAssociatedTokenAddressSync(usdc, feeOwner);
    if (recipient.equals(source)) return fail("La wallet de recaudo no puede usarse para esta comprobación de comisión.");
    const addresses = [source, tokenA, recipient, position, state.nftMint, owned.positionNftAccount, owner];
    const before = await connection.getMultipleAccountsInfo(addresses);
    const amount = (account: { owner: string; data: string[] } | null | undefined, mint: PublicKey, accountOwner: PublicKey) => {
      if (!account || !account.data[0]) return 0n;
      if (account.owner !== TOKEN_PROGRAM_ID.toBase58()) throw new Error("Programa de cuenta inválido");
      const decoded = AccountLayout.decode(Buffer.from(account.data[0], "base64"));
      if (!decoded.mint.equals(mint) || !decoded.owner.equals(accountOwner)) throw new Error("Cuenta de token inválida");
      return decoded.amount;
    };
    const asSim = (a: (typeof before)[number]) => a ? { owner: a.owner.toBase58(), data: [Buffer.from(a.data).toString("base64"), "base64"] as [string, string] } : null;
    const usdcBefore = amount(asSim(before[0] ?? null), usdc, owner), aBefore = amount(asSim(before[1] ?? null), pool.tokenAMint, owner), feeBefore = amount(asSim(before[2] ?? null), usdc, feeOwner);
    const quote = cp.getWithdrawQuote({ liquidityDelta: state.unlockedLiquidity, sqrtPrice: pool.sqrtPrice, minSqrtPrice: pool.sqrtMinPrice, maxSqrtPrice: pool.sqrtMaxPrice, collectFeeMode: pool.collectFeeMode, tokenAAmount: pool.tokenAAmount, tokenBAmount: pool.tokenBAmount, liquidity: pool.liquidity });
    const removal = await cp.removeAllLiquidityAndClosePosition({ owner, position, positionNftAccount: owned.positionNftAccount, positionState: state, poolState: pool, vestings: [], currentPoint: new BN(0), tokenAAmountThreshold: quote.outAmountA.muln(995).divn(1000), tokenBAmountThreshold: quote.outAmountB.muln(995).divn(1000), isSkipReward: false });
    // Hold withdrawn wrapped SOL for Jupiter. Never unwrap or close preexisting token accounts.
    const removalIxs = removal.instructions.filter((ix) => !(pool.tokenAMint.equals(NATIVE_MINT) && ix.programId.equals(TOKEN_PROGRAM_ID) && ix.data[0] === 9 && ix.keys[0]?.pubkey.equals(tokenA)));
    const block = await connection.getLatestBlockhash();
    const tables: NonNullable<Awaited<ReturnType<typeof connection.getAddressLookupTable>>["value"]>[] = [];
    const simulate = async (instructions: TransactionInstruction[]) => {
      const tx = new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: block.blockhash, instructions: compactDepositInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }), ...instructions.filter((ix) => !ix.programId.equals(ComputeBudgetProgram.programId))]) }).compileToV0Message(tables));
      const bytes = tx.serialize().length;
      if (bytes > 1232) throw new Error("Tamaño excedido");
      const fee = await connection.getFeeForMessage(tx.message, "confirmed");
      if (fee.value === null) throw new Error("Coste de red no disponible");
      const response = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, accounts: { encoding: "base64", addresses: addresses.map((a) => a.toBase58()) } });
      if (response.value.err || !response.value.accounts) throw new Error("Simulación rechazada");
      return { accounts: response.value.accounts, bytes, networkFee: BigInt(fee.value) };
    };
    const removed = await simulate(removalIxs);
    const aReceived = amount(removed.accounts[1], pool.tokenAMint, owner) - aBefore;
    if (aReceived < 0n) return fail("El retiro consumió tokens ajenos a la posición.");
    const instructions = [...removalIxs];
    if (aReceived > 0n) {
      const request = async (path: string, body?: unknown) => {
        const response = await fetch(`https://api.jup.ag/swap/v1/${path}`, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20_000) });
        if (!response.ok) throw new Error("Jupiter no disponible");
        return response.json();
      };
      const params = new URLSearchParams({ inputMint: config.mint, outputMint: USDC_MINT, amount: aReceived.toString(), slippageBps: "50", maxAccounts: "24", onlyDirectRoutes: "true", excludeDexes: "Meteora,Meteora DLMM,Meteora DAMM v2" });
      const jQuote = quoteSchema.parse(await request(`quote?${params}`));
      if (jQuote.inputMint !== config.mint || jQuote.outputMint !== USDC_MINT || jQuote.inAmount !== aReceived.toString() || jQuote.routePlan.some((r) => r.swapInfo.ammKey === config.pool)) return fail("La conversión no coincide con los fondos retirados.");
      const swap = swapSchema.parse(await request("swap-instructions", { quoteResponse: jQuote, userPublicKey: input.wallet, wrapAndUnwrapSol: false, dynamicComputeUnitLimit: false }));
      const decode = (ix: z.infer<typeof ixSchema>) => new TransactionInstruction({ programId: new PublicKey(ix.programId), keys: ix.accounts.map((a) => ({ ...a, pubkey: new PublicKey(a.pubkey) })), data: Buffer.from(ix.data, "base64") });
      if (swap.cleanupInstruction) return fail("La ruta necesita un cierre de cuenta adicional que todavía no está validado.");
      instructions.push(...swap.setupInstructions.map(decode), ...(swap.otherInstructions ?? []).map(decode), decode(swap.swapInstruction));
      for (const address of swap.addressLookupTableAddresses) {
        const table = await connection.getAddressLookupTable(new PublicKey(address));
        if (!table.value) return fail("Tabla de direcciones no disponible.");
        tables.push(table.value);
      }
    }
    const converted = await simulate(instructions);
    const gross = amount(converted.accounts[0], usdc, owner) - usdcBefore;
    if (gross <= 0n) return fail("No hay devolución positiva de USDC.");
    const breakdown = withdrawalAmounts(gross);
    if (!before[2]) instructions.push(createAssociatedTokenAccountIdempotentInstruction(owner, recipient, feeOwner, usdc));
    instructions.push(createTransferCheckedInstruction(source, usdc, recipient, owner, breakdown.fee, 6));
    const final = await simulate(instructions);
    const feeDelta = amount(final.accounts[2], usdc, feeOwner) - feeBefore;
    const netDelta = amount(final.accounts[0], usdc, owner) - usdcBefore;
    const closed = [3, 4, 5].every((i) => !final.accounts[i] || final.accounts[i]?.lamports === 0);
    const rentLamports = [3, 4, 5].reduce((sum, i) => sum + BigInt(before[i]?.lamports ?? 0), 0n);
    // Account for simulated network fees. Compare the complete wallet lamport delta,
    // allowing only rent for newly created token accounts, not token principal.
    const newAccountRent = [0, 1, 2].reduce((sum, i) => sum + BigInt(before[i] ? 0 : final.accounts[i]?.lamports ?? 0), 0n);
    const solDelta = BigInt(final.accounts[6]?.lamports ?? 0) - BigInt(before[6]?.lamports ?? 0);
    const checks = { closed, usdc: netDelta === breakdown.net && amount(final.accounts[1], pool.tokenAMint, owner) === aBefore, fee: feeDelta === breakdown.fee && feeDelta === (netDelta + feeDelta) / 100n, rent: closed && rentLamports > 0n && solDelta + newAccountRent + final.networkFee === rentLamports };
    return { success: Object.values(checks).every(Boolean), sent: false, bytes: final.bytes, checks, gross: tokenAmount(gross.toString(), 6), fee: tokenAmount(breakdown.fee.toString(), 6), net: tokenAmount(breakdown.net.toString(), 6), rentSol: tokenAmount(rentLamports.toString(), 9), message: "Solo simulación: se comprueban USDC, comisión y cierre de posición, mint y cuenta NFT. La firma sigue bloqueada: un swap puede variar los fondos realizados y una transferencia SPL fija no calcula dinámicamente el 1%. No se ha retirado dinero." };
  } catch {
    return fail("No se pudo validar el retiro completo, la conversión o la devolución de renta. No se firmó ni envió nada; la posición permanece intacta.");
  }
}