import BN from "bn.js";
import { Buffer } from "buffer";
import { z } from "zod";
import { ComputeBudgetProgram, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { CpAmm, getCurrentPoint } from "@meteora-ag/cp-amm-sdk/dist/index.js";
import { ownsPositionNft } from "@/lib/position-ownership.server";
import { heliusConnection } from "@/lib/solana-read.server";
import { CHAIN_POOLS, USDC_MINT, tokenAmount, solanaAddressSchema } from "@/lib/solana-data";
import { FEE_WALLET } from "@/lib/fees";
import { compactDepositInstructions } from "@/lib/compact-deposit";
import { computeBudgetIxs, computeLimit, MAX_COMPUTE_UNITS } from "@/lib/compute-budget";
import { withdrawalAmounts, type WithdrawalInput, type WithdrawalResult } from "@/lib/withdrawal";

const ixSchema = z.object({ programId: solanaAddressSchema, accounts: z.array(z.object({ pubkey: solanaAddressSchema, isSigner: z.boolean(), isWritable: z.boolean() })), data: z.string().max(20_000) });
const swapSchema = z.object({ setupInstructions: z.array(ixSchema), otherInstructions: z.array(ixSchema).optional(), tokenLedgerInstruction: ixSchema.optional(), swapInstruction: ixSchema, cleanupInstruction: ixSchema.nullable().optional(), addressLookupTableAddresses: z.array(solanaAddressSchema).max(16) });
const quoteSchema = z.object({ inputMint: z.string(), outputMint: z.string(), inAmount: z.string().regex(/^\d+$/), otherAmountThreshold: z.string().regex(/^\d+$/), swapMode: z.literal("ExactIn"), routePlan: z.array(z.object({ swapInfo: z.object({ ammKey: z.string() }).passthrough() }).passthrough()) }).passthrough();

/** Atomic owner-verified close: fixed 1% fee on on-chain minima, delta-only conversion, owner signs only. */
export async function simulateWithdrawal(apiKey: string, input: WithdrawalInput, options: { prepare?: boolean; maximumFeeRaw?: string; minimumNetRaw?: string } = {}): Promise<WithdrawalResult> {
  const startedAt = Date.now();
  let stage = "Lectura de posición";
  const fail = (message: string, bytes?: number): WithdrawalResult => ({ success: false, sent: false, message, ...(bytes === undefined ? {} : { bytes }) });
  try {
    const connection = heliusConnection(apiKey);
    if (await connection.getGenesisHash() !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d") return fail("La conexión no corresponde a la red principal.");
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
    if (!ownsPositionNft(owner, state.nftMint, before[5], before[4])) return fail("No se pudo comprobar el NFT de esta posición y su wallet propietaria.");
    const amount = (account: { owner: string; data: string[] } | null | undefined, mint: PublicKey, accountOwner: PublicKey) => {
      if (!account || !account.data[0]) return 0n;
      if (account.owner !== TOKEN_PROGRAM_ID.toBase58()) throw new Error("Programa de cuenta inválido");
      const decoded = AccountLayout.decode(Buffer.from(account.data[0], "base64"));
      if (!decoded.mint.equals(mint) || !decoded.owner.equals(accountOwner) || decoded.state !== 1) throw new Error("Cuenta de token inválida");
      return decoded.amount;
    };
    const asSim = (a: (typeof before)[number]) => a ? { owner: a.owner.toBase58(), data: [Buffer.from(a.data).toString("base64"), "base64"] as [string, string] } : null;
    const usdcBefore = amount(asSim(before[0] ?? null), usdc, owner), aBefore = amount(asSim(before[1] ?? null), pool.tokenAMint, owner), feeBefore = amount(asSim(before[2] ?? null), usdc, feeOwner);
    stage = "Preparación del cierre";
    const quote = cp.getWithdrawQuote({ liquidityDelta: state.unlockedLiquidity, sqrtPrice: pool.sqrtPrice, minSqrtPrice: pool.sqrtMinPrice, maxSqrtPrice: pool.sqrtMaxPrice, collectFeeMode: pool.collectFeeMode, tokenAAmount: pool.tokenAAmount, tokenBAmount: pool.tokenBAmount, liquidity: pool.liquidity });
    const minimumA = quote.outAmountA.muln(995).divn(1000);
    const minimumB = quote.outAmountB.muln(995).divn(1000);
    const currentPoint = await getCurrentPoint(connection, pool.activationType);
    const removal = await cp.removeAllLiquidityAndClosePosition({ owner, position, positionNftAccount: owned.positionNftAccount, positionState: state, poolState: pool, vestings: [], currentPoint, tokenAAmountThreshold: minimumA, tokenBAmountThreshold: minimumB, isSkipReward: false });
    // Hold withdrawn wrapped SOL for Jupiter. Never unwrap or close preexisting token accounts.
    const removalIxs = removal.instructions.filter((ix) => !(pool.tokenAMint.equals(NATIVE_MINT) && ix.programId.equals(TOKEN_PROGRAM_ID) && ix.data[0] === 9 && ix.keys[0]?.pubkey.equals(tokenA)));
    const block = await connection.getLatestBlockhash();
    const tables: NonNullable<Awaited<ReturnType<typeof connection.getAddressLookupTable>>["value"]>[] = [];
    const simulate = async (instructions: TransactionInstruction[], units = MAX_COMPUTE_UNITS) => {
      const tx = new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: block.blockhash, instructions: compactDepositInstructions([...computeBudgetIxs(units), ...instructions.filter((ix) => !ix.programId.equals(ComputeBudgetProgram.programId))]) }).compileToV0Message(tables));
      const bytes = tx.serialize().length;
      if (bytes > 1232) throw new Error("Tamaño excedido");
      const fee = await connection.getFeeForMessage(tx.message, "confirmed");
      if (fee.value === null) throw new Error("Coste de red no disponible");
      const response = await connection.simulateTransaction(tx, { sigVerify: false, accounts: { encoding: "base64", addresses: addresses.map((a) => a.toBase58()) } });
      if (response.value.err || !response.value.accounts || response.value.accounts.length !== addresses.length) throw new Error("Simulación rechazada");
      return { tx, accounts: response.value.accounts, bytes, networkFee: BigInt(fee.value), units: response.value.unitsConsumed };
    };
    stage = "Simulación del cierre";
    const removed = await simulate(removalIxs);
    const aReceived = amount(removed.accounts[1], pool.tokenAMint, owner) - aBefore;
    if (aReceived < 0n) return fail("El retiro consumió tokens ajenos a la posición.");
    const instructions = [...removalIxs];
    let minimumSwap = 0n;
    if (aReceived > 0n) {
      stage = "Cotización Jupiter";
      const request = async (path: string, body?: unknown) => {
        for (let attempt = 0; ; attempt++) {
          const response = await fetch(`https://api.jup.ag/swap/v1/${path}`, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20_000) });
          if (response.status === 429 && attempt < 5) { await new Promise((resolve) => setTimeout(resolve, 1_200 * (attempt + 1))); continue; }
          if (!response.ok) throw new Error("Jupiter no disponible");
          return response.json();
        }
      };
      // Quote the minimum token A released by Meteora, excluding variable fees and upside.
      // The token ledger consumes the actual withdrawal delta, never the old token balance.
      const swapInput = BigInt(minimumA.toString());
      if (swapInput <= 0n) return fail("El retiro no permite proteger un mínimo positivo para la conversión.");
      const params = new URLSearchParams({ inputMint: config.mint, outputMint: USDC_MINT, amount: swapInput.toString(), slippageBps: "50", maxAccounts: "24", onlyDirectRoutes: "true", excludeDexes: "Meteora,Meteora DLMM,Meteora DAMM v2" });
      const jQuote = quoteSchema.parse(await request(`quote?${params}`));
      if (jQuote.inputMint !== config.mint || jQuote.outputMint !== USDC_MINT || jQuote.inAmount !== swapInput.toString() || jQuote.routePlan.some((r) => r.swapInfo.ammKey === config.pool)) return fail("La conversión no coincide con los fondos retirados.");
      minimumSwap = BigInt(jQuote.otherAmountThreshold);
      stage = "Preparación Jupiter";
      const swap = swapSchema.parse(await request("swap-instructions", { quoteResponse: jQuote, userPublicKey: input.wallet, wrapAndUnwrapSol: false, dynamicComputeUnitLimit: false, useTokenLedger: true, useSharedAccounts: false }));
      const decode = (ix: z.infer<typeof ixSchema>) => new TransactionInstruction({ programId: new PublicKey(ix.programId), keys: ix.accounts.map((a) => ({ ...a, pubkey: new PublicKey(a.pubkey) })), data: Buffer.from(ix.data, "base64") });
      if (swap.cleanupInstruction) return fail("La ruta necesita un cierre de cuenta adicional que todavía no está validado.");
      if (!swap.tokenLedgerInstruction) return fail("Jupiter no proporcionó el registro de saldo necesario para no consumir tokens previos.");
      const ledger = decode(swap.tokenLedgerInstruction), route = decode(swap.swapInstruction);
      const jupiterProgram = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
      if (!ledger.programId.equals(jupiterProgram) || !ledger.data.equals(Buffer.from([228, 85, 185, 112, 78, 79, 77, 2])) || !ledger.keys[1]?.pubkey.equals(tokenA) || !route.programId.equals(jupiterProgram) || !route.data.subarray(0, 8).equals(Buffer.from([150, 86, 71, 116, 167, 93, 14, 104])) || !route.keys[1]?.pubkey.equals(owner) || !route.keys[2]?.pubkey.equals(tokenA) || !route.keys[3]?.pubkey.equals(source) || !route.keys[5]?.pubkey.equals(usdc) || !route.keys[7]?.pubkey.equals(ledger.keys[0]?.pubkey ?? PublicKey.default) || route.data.length < 23) return fail("El registro de saldo o la ruta Jupiter no coincide con el retiro autorizado.");
      // Borsh route_with_token_ledger ends in quoted_out_amount:u64,
      // slippage_bps:u16, platform_fee_bps:u8. Enforce the exact quote minimum
      // with zero additional slippage rather than discounting the minimum twice.
      if (route.data[route.data.length - 1] !== 0) return fail("La ruta incluye una comisión adicional no autorizada.");
      route.data.writeBigUInt64LE(minimumSwap, route.data.length - 11);
      route.data.writeUInt16LE(0, route.data.length - 3);
      if ((swap.otherInstructions ?? []).length > 0) return fail("La ruta incluye instrucciones adicionales no verificadas.");
      const setup = swap.setupInstructions.map(decode);
      const ataProgram = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
      if (setup.some((ix) => !ix.programId.equals(ataProgram) || ix.data.length !== 1 || ix.data[0] !== 1 || !ix.keys[0]?.pubkey.equals(owner))) return fail("La preparación Jupiter contiene movimientos adicionales no autorizados.");
      instructions.unshift(...setup, ledger);
      instructions.push(route);
      const loaded = await Promise.all(swap.addressLookupTableAddresses.map((address) => connection.getAddressLookupTable(new PublicKey(address))));
      for (const table of loaded) {
        if (!table.value) return fail("Tabla de direcciones no disponible.");
        tables.push(table.value);
      }
    }
    stage = "Simulación de conversión a USDC";
    const converted = await simulate(instructions);
    const gross = amount(converted.accounts[0], usdc, owner) - usdcBefore;
    if (gross <= 0n) return fail("No hay devolución positiva de USDC.");
    const minimumGross = BigInt(minimumB.toString()) + minimumSwap;
    const breakdown = withdrawalAmounts(minimumGross);
    if (minimumGross <= 0n) return fail("No hay un mínimo de USDC protegido por los contratos.");
    if (options.prepare && (options.maximumFeeRaw === undefined || options.minimumNetRaw === undefined || breakdown.fee > BigInt(options.maximumFeeRaw) * 101n / 100n + 1n || breakdown.net < BigInt(options.minimumNetRaw) * 99n / 100n)) return fail("La cotización cambió: vuelve a revisar el mínimo y la comisión antes de firmar.");
    if (breakdown.fee > 0n) {
      if (!before[2]) instructions.push(createAssociatedTokenAccountIdempotentInstruction(owner, recipient, feeOwner, usdc));
      instructions.push(createTransferCheckedInstruction(source, usdc, recipient, owner, breakdown.fee, 6));
    }
    stage = "Simulación de comisión y renta";
    const sized = await simulate(instructions);
    // Re-simulate with a tight compute limit so wallets do not price congestion on 1.4M units.
    const final = await simulate(instructions, computeLimit(sized.units));
    const feeDelta = amount(final.accounts[2], usdc, feeOwner) - feeBefore;
    const netDelta = amount(final.accounts[0], usdc, owner) - usdcBefore;
    const realizedGross = netDelta + feeDelta;
    if (netDelta < 0n || feeDelta < 0n || realizedGross <= 0n) return fail("La liquidación no conserva los saldos de USDC anteriores; no se autoriza ninguna firma.");
    const remainingToken = amount(final.accounts[1], pool.tokenAMint, owner) - aBefore;
    const closed = [3, 4, 5].every((i) => !final.accounts[i] || final.accounts[i]?.lamports === 0);
    const rentLamports = [3, 4, 5].reduce((sum, i) => sum + BigInt(before[i]?.lamports ?? 0), 0n);
    // Account for simulated network fees. Compare the complete wallet lamport delta,
    // allowing only rent for newly created token accounts, not token principal.
    const newAccountRent = [0, 1, 2].reduce((sum, i) => sum + BigInt(before[i] ? 0 : final.accounts[i]?.lamports ?? 0), 0n);
    const solDelta = BigInt(final.accounts[6]?.lamports ?? 0) - BigInt(before[6]?.lamports ?? 0);
    const checks = { closed, usdc: remainingToken === 0n && netDelta >= breakdown.net && realizedGross >= minimumGross, fee: feeDelta === breakdown.fee && feeDelta === withdrawalAmounts(minimumGross).fee, rent: closed && rentLamports > 0n && solDelta + newAccountRent + final.networkFee === rentLamports };
    const success = Object.values(checks).every(Boolean);
    if (options.prepare && Date.now() - startedAt > 45_000) return fail("La preparación tardó demasiado. Repite la revisión para obtener una transacción reciente.");
    return { success, sent: false, bytes: final.bytes, checks, gross: tokenAmount(realizedGross.toString(), 6), fee: tokenAmount(feeDelta.toString(), 6), net: tokenAmount(netDelta.toString(), 6), expectedFee: tokenAmount(breakdown.fee.toString(), 6), minimumGross: tokenAmount(minimumGross.toString(), 6), minimumNet: tokenAmount(breakdown.net.toString(), 6), feeRaw: breakdown.fee.toString(), minimumNetRaw: breakdown.net.toString(), remainingTokenRaw: remainingToken.toString(), rentSol: tokenAmount(rentLamports.toString(), 9), ...(success && options.prepare ? { prepared: { transaction: Buffer.from(final.tx.serialize()).toString("base64"), expiresAt: startedAt + 45_000, lastValidBlockHeight: block.lastValidBlockHeight, wallet: input.wallet, position: input.position } } : {}), message: success ? "Retiro verificado en simulación. Comisión fija del 1% sobre el mínimo bruto protegido por slippage; cualquier USDC adicional es tuyo. La renta del NFT se devuelve en SOL y no lleva esta comisión. Solo tu wallet puede firmar y enviar." : "El retiro no superó todas las comprobaciones de mínimos, saldos previos, comisión y renta. No se autoriza ninguna firma." };
  } catch {
    return fail(`No se pudo validar el retiro. Etapa: ${stage}. No se firmó ni envió nada; la posición permanece intacta.`);
  }
}