import BN from "bn.js";
import { Buffer } from "buffer";
import { ComputeBudgetProgram, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { CpAmm } from "@meteora-ag/cp-amm-sdk/dist/index.js";
import { currentActivationPoint } from "@/lib/chain-clock.server";
import { ownsPositionNft } from "@/lib/position-ownership.server";
import { heliusConnection } from "@/lib/solana-read.server";
import { CHAIN_POOLS, USDC_MINT, tokenAmount } from "@/lib/solana-data";
import { FEE_WALLET } from "@/lib/fees";
import { compactDepositInstructions, dropExistingAtaCreates } from "@/lib/compact-deposit";
import { computeBudgetIxs, computeLimit, MAX_COMPUTE_UNITS, networkFeeOf } from "@/lib/compute-budget";
import { ledgerSwapToUsdc, freshIntermediates, closeIntermediates } from "@/lib/ledger-swap.server";
import { simulateDlmmWithdrawal } from "@/lib/dlmm.server";
import { withdrawalAmounts, exitFeeMode, partialLiquidity, type WithdrawalInput, type WithdrawalResult } from "@/lib/withdrawal";


/** Share of each quoted token the pool must release on exit (basis points). */
const EXIT_TOKEN_FLOOR_BPS = 9_800;
/** Leftover base units of the released token accepted as rounding dust after conversion. */
const EXIT_DUST_UNITS = 1_000n;

/** Atomic owner-verified close: tiered exit fee on on-chain minima, delta-only conversion, owner signs only. */
export async function simulateWithdrawal(apiKey: string, input: WithdrawalInput & { percent?: number | undefined; migrate?: true | undefined; rotate?: true | undefined }, options: { prepare?: boolean; maximumFeeRaw?: string; minimumNetRaw?: string } = {}): Promise<WithdrawalResult> {
  const startedAt = Date.now();
  let stage = "Lectura de posición";
  const fail = (message: string, bytes?: number): WithdrawalResult => ({ success: false, sent: false, message, ...(bytes === undefined ? {} : { bytes }) });
  try {
    const connection = heliusConnection(apiKey);
    if (await connection.getGenesisHash() !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d") return fail("La conexión no corresponde a la red principal.");
    const percent = input.percent ?? 100, full = percent === 100;
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) return fail("Porcentaje de retiro no válido.");
    const config = CHAIN_POOLS.find((p) => p.id === input.vaultId);
    if (!config) return fail("Bóveda no válida.");
    if (config.kind === "dlmm") return simulateDlmmWithdrawal(connection, input, options);
    const owner = new PublicKey(input.wallet), position = new PublicKey(input.position), usdc = new PublicKey(USDC_MINT);
    const cp = new CpAmm(connection);
    const owned = (await cp.getPositionsByUser(owner)).find((p) => p.position.equals(position));
    if (!owned || owned.positionState.pool.toBase58() !== config.pool) return fail("La posición no pertenece a esta wallet y bóveda.");
    const state = owned.positionState, pool = await cp.fetchPoolState(state.pool);
    if (!pool.tokenAMint.equals(new PublicKey(config.mint)) || !pool.tokenBMint.equals(usdc) || pool.tokenAFlag !== 0 || pool.tokenBFlag !== 0) return fail("Los tokens o programas de este pool no están validados.");
    if (full && (!state.vestedLiquidity.isZero() || !state.permanentLockedLiquidity.isZero())) return fail("La posición tiene liquidez bloqueada; no se cerrará ni se prometerá recuperar su renta.");
    if (full && pool.rewardInfos.some((r) => r.initialized)) return fail("Esta posición requiere validar recompensas adicionales antes de liquidarla por completo.");
    const source = getAssociatedTokenAddressSync(usdc, owner), tokenA = getAssociatedTokenAddressSync(pool.tokenAMint, owner);
    const feeOwner = new PublicKey(FEE_WALLET), recipient = getAssociatedTokenAddressSync(usdc, feeOwner);
    if (recipient.equals(source)) return fail("La wallet de recaudo no puede usarse para esta comprobación de comisión.");
    const addresses = [source, tokenA, recipient, position, state.nftMint, owned.positionNftAccount, owner];
    const before = await connection.getMultipleAccountsInfo(addresses);
    // Idempotent creation of token accounts that already exist is a no-op; omit it to keep one signature.
    const existing = new Set([0, 1, 2].filter((i) => before[i]).map((i) => addresses[i]!.toBase58()));
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
    const liquidityDelta = full ? state.unlockedLiquidity : new BN(partialLiquidity(BigInt(state.unlockedLiquidity.toString()), percent).toString());
    if (liquidityDelta.isZero()) return fail("La parte elegida es demasiado pequeña para retirarla.");
    const quote = cp.getWithdrawQuote({ liquidityDelta, sqrtPrice: pool.sqrtPrice, minSqrtPrice: pool.sqrtMinPrice, maxSqrtPrice: pool.sqrtMaxPrice, collectFeeMode: pool.collectFeeMode, tokenAAmount: pool.tokenAAmount, tokenBAmount: pool.tokenBAmount, liquidity: pool.liquidity });
    // Per-token floor: in a concentrated pool a small price move shifts the token split between
    // quote and confirmation, so 0.5% per token made exits fail at random. 2% per token keeps the
    // total value protected (the USDC minimum and fee use these floors) and matches range vaults.
    const minimumA = quote.outAmountA.muln(EXIT_TOKEN_FLOOR_BPS).divn(10_000);
    const minimumB = quote.outAmountB.muln(EXIT_TOKEN_FLOOR_BPS).divn(10_000);
    const currentPoint = await currentActivationPoint(connection, pool.activationType);
    const removal = full
      ? await cp.removeAllLiquidityAndClosePosition({ owner, position, positionNftAccount: owned.positionNftAccount, positionState: state, poolState: pool, vestings: [], currentPoint, tokenAAmountThreshold: minimumA, tokenBAmountThreshold: minimumB, isSkipReward: false })
      : await cp.removeLiquidity({ owner, position, pool: state.pool, positionNftAccount: owned.positionNftAccount, liquidityDelta, tokenAAmountThreshold: minimumA, tokenBAmountThreshold: minimumB, tokenAMint: pool.tokenAMint, tokenBMint: pool.tokenBMint, tokenAVault: pool.tokenAVault, tokenBVault: pool.tokenBVault, tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID, vestings: [], currentPoint });
    // Hold withdrawn wrapped SOL for Jupiter. Never unwrap or close preexisting token accounts.
    const removalIxs = removal.instructions.filter((ix) => !(pool.tokenAMint.equals(NATIVE_MINT) && ix.programId.equals(TOKEN_PROGRAM_ID) && ix.data[0] === 9 && ix.keys[0]?.pubkey.equals(tokenA)));
    const block = await connection.getLatestBlockhash();
    const tables: NonNullable<Awaited<ReturnType<typeof connection.getAddressLookupTable>>["value"]>[] = [];
    const simulate = async (instructions: TransactionInstruction[], units = MAX_COMPUTE_UNITS) => {
      const tx = new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: block.blockhash, instructions: compactDepositInstructions([...computeBudgetIxs(units), ...dropExistingAtaCreates(instructions.filter((ix) => !ix.programId.equals(ComputeBudgetProgram.programId)), existing)]) }).compileToV0Message(tables));
      const bytes = tx.serialize().length;
      if (bytes > 1232) throw new Error("Tamaño excedido");
      const fee = { value: await networkFeeOf(connection, tx.message, units) };
      const response = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, accounts: { encoding: "base64", addresses: addresses.map((a) => a.toBase58()) } });
      if (response.value.err || !response.value.accounts || response.value.accounts.length !== addresses.length) throw new Error(`Simulación rechazada: ${JSON.stringify(response.value.err)} ${(response.value.logs ?? []).filter((l) => /error|failed|exceed|slippage/i.test(l)).slice(-3).join(" | ")}`);
      return { tx, accounts: response.value.accounts, bytes, networkFee: BigInt(fee.value), units: response.value.unitsConsumed };
    };
    stage = "Simulación del cierre";
    const removed = await simulate(removalIxs);
    const aReceived = amount(removed.accounts[1], pool.tokenAMint, owner) - aBefore;
    if (aReceived < 0n) return fail("El retiro consumió tokens ajenos a la posición.");
    const instructions = [...removalIxs];
    let minimumSwap = 0n;
    let closes: TransactionInstruction[] = [];
    // If closing an intermediate fails (dust) or does not fit, keep it open and count its rent instead.
    const withCloseFallback = async (units?: number) => {
      try { return await simulate(instructions, units); } catch (error) {
        if (closes.length === 0) throw error;
        for (const ix of closes) instructions.splice(instructions.indexOf(ix), 1);
        closes = [];
        return simulate(instructions, units);
      }
    };
    if (aReceived > 0n) {
      stage = "Cotización Jupiter";
      // Quote the minimum token A released by Meteora, excluding variable fees and upside.
      // The token ledger consumes the actual withdrawal delta, never the old token balance.
      const swap = await ledgerSwapToUsdc(connection, { owner, inputMint: config.mint, inputAta: tokenA, usdcAta: source, minimumIn: BigInt(minimumA.toString()), pool: config.pool, fits: async (s) => {
        // Size the complete message (removal, route, intermediate close, fee transfer) before simulating.
        const fresh = await freshIntermediates(connection, s.intermediates);
        const ixs = [...s.setup, s.ledger, ...removalIxs, s.route, ...closeIntermediates(fresh, owner), ...(before[2] ? [] : [createAssociatedTokenAccountIdempotentInstruction(owner, recipient, feeOwner, usdc)]), createTransferCheckedInstruction(source, usdc, recipient, owner, 1n, 6)];
        return new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: block.blockhash, instructions: compactDepositInstructions([...computeBudgetIxs(MAX_COMPUTE_UNITS), ...dropExistingAtaCreates(ixs.filter((ix) => !ix.programId.equals(ComputeBudgetProgram.programId)), existing)]) }).compileToV0Message([...tables, ...s.tables])).serialize().length <= 1232;
      } });
      if (!swap.ok) return fail(swap.message);
      minimumSwap = swap.minimumSwap;
      instructions.unshift(...swap.setup, swap.ledger);
      // Multi-hop routes may create an intermediate token account; track it and close it afterwards.
      const fresh = await freshIntermediates(connection, swap.intermediates);
      addresses.push(...fresh.map((e) => e.ata));
      closes = closeIntermediates(fresh, owner);
      instructions.push(swap.route, ...closes);
      tables.push(...swap.tables);
    }
    stage = "Simulación de conversión a USDC";
    const converted = await withCloseFallback();
    const gross = amount(converted.accounts[0], usdc, owner) - usdcBefore;
    if (gross <= 0n) return fail("No hay devolución positiva de USDC.");
    const minimumGross = BigInt(minimumB.toString()) + minimumSwap;
    const breakdown = withdrawalAmounts(minimumGross, exitFeeMode(input));
    if (minimumGross <= 0n) return fail("No hay un mínimo de USDC protegido por los contratos.");
    if (options.prepare && (options.maximumFeeRaw === undefined || options.minimumNetRaw === undefined || breakdown.fee > BigInt(options.maximumFeeRaw) * 101n / 100n + 1n || breakdown.net < BigInt(options.minimumNetRaw) * 99n / 100n)) return fail("La cotización cambió: vuelve a revisar el mínimo y la comisión antes de firmar.");
    if (breakdown.fee > 0n) {
      if (!before[2]) instructions.push(createAssociatedTokenAccountIdempotentInstruction(owner, recipient, feeOwner, usdc));
      instructions.push(createTransferCheckedInstruction(source, usdc, recipient, owner, breakdown.fee, 6));
    }
    stage = "Simulación de comisión y renta";
    const sized = await withCloseFallback();
    // Re-simulate with a tight compute limit so wallets do not price congestion on 1.4M units.
    const final = await simulate(instructions, computeLimit(sized.units));
    const feeDelta = amount(final.accounts[2], usdc, feeOwner) - feeBefore;
    const netDelta = amount(final.accounts[0], usdc, owner) - usdcBefore;
    const realizedGross = netDelta + feeDelta;
    if (netDelta < 0n || feeDelta < 0n || realizedGross <= 0n) return fail("La liquidación no conserva los saldos de USDC anteriores; no se autoriza ninguna firma.");
    const remainingToken = amount(final.accounts[1], pool.tokenAMint, owner) - aBefore;
    const gone = [3, 4, 5].every((i) => !final.accounts[i] || final.accounts[i]?.lamports === 0);
    const kept = [3, 4, 5].every((i) => (final.accounts[i]?.lamports ?? 0) > 0) && ownsPositionNft(owner, state.nftMint, final.accounts[5] ? { ...final.accounts[5], owner: new PublicKey(final.accounts[5].owner), data: Buffer.from(final.accounts[5].data[0] ?? "", "base64") } as never : null, final.accounts[4] ? { ...final.accounts[4], owner: new PublicKey(final.accounts[4].owner), data: Buffer.from(final.accounts[4].data[0] ?? "", "base64") } as never : null);
    const closed = full ? gone : kept;
    const rentLamports = full ? [3, 4, 5].reduce((sum, i) => sum + BigInt(before[i]?.lamports ?? 0), 0n) : 0n;
    // Account for simulated network fees. Compare the complete wallet lamport delta,
    // allowing only rent for newly created token accounts, not token principal.
    const newAccountRent = [0, 1, 2].reduce((sum, i) => sum + BigInt(before[i] ? 0 : final.accounts[i]?.lamports ?? 0), 0n) + final.accounts.slice(7).reduce((sum, a) => sum + BigInt(a?.lamports ?? 0), 0n);
    const solDelta = BigInt(final.accounts[6]?.lamports ?? 0) - BigInt(before[6]?.lamports ?? 0);
    // Some routes cannot consume the last base unit of the released token; tolerate negligible dust.
    // With a newly created wrapped-SOL account that dust sits in its lamports, so exclude it from rent.
    const dustOk = remainingToken >= 0n && remainingToken <= EXIT_DUST_UNITS;
    const nativeDust = pool.tokenAMint.equals(NATIVE_MINT) && !before[1] && dustOk ? remainingToken : 0n;
    const checks = { closed, usdc: dustOk && netDelta >= breakdown.net && realizedGross >= minimumGross, fee: feeDelta === breakdown.fee && feeDelta === withdrawalAmounts(minimumGross, exitFeeMode(input)).fee, rent: closed && (full ? rentLamports > 0n : true) && solDelta + newAccountRent - nativeDust + final.networkFee === rentLamports };
    const success = Object.values(checks).every(Boolean);
    if (!success) console.error("[withdrawal] checks", { vault: input.vaultId, percent, checks, netDelta: netDelta.toString(), net: breakdown.net.toString(), realizedGross: realizedGross.toString(), minimumGross: minimumGross.toString(), remainingToken: remainingToken.toString(), solDelta: solDelta.toString(), newAccountRent: newAccountRent.toString(), networkFee: final.networkFee.toString(), rentLamports: rentLamports.toString() });
    if (options.prepare && Date.now() - startedAt > 45_000) return fail("La preparación tardó demasiado. Repite la revisión para obtener una transacción reciente.");
    return { success, sent: false, bytes: final.bytes, checks, gross: tokenAmount(realizedGross.toString(), 6), fee: tokenAmount(feeDelta.toString(), 6), net: tokenAmount(netDelta.toString(), 6), expectedFee: tokenAmount(breakdown.fee.toString(), 6), minimumGross: tokenAmount(minimumGross.toString(), 6), minimumNet: tokenAmount(breakdown.net.toString(), 6), feeRaw: breakdown.fee.toString(), minimumNetRaw: breakdown.net.toString(), remainingTokenRaw: remainingToken.toString(), rentSol: tokenAmount(rentLamports.toString(), 9), ...(success && options.prepare ? { prepared: { transaction: Buffer.from(final.tx.serialize()).toString("base64"), expiresAt: startedAt + 45_000, lastValidBlockHeight: block.lastValidBlockHeight, wallet: input.wallet, position: input.position } } : {}), message: success && !full ? `Retiro parcial del ${percent}% verificado en simulación. Tu posición sigue abierta con el resto; comisión según la tarifa progresiva sobre el mínimo protegido. Solo tu wallet puede firmar y enviar.` : success ? "Retiro verificado en simulación. Comisión fija del 1% sobre el mínimo bruto protegido por slippage; cualquier USDC adicional es tuyo. La renta del NFT se devuelve en SOL y no lleva esta comisión. Solo tu wallet puede firmar y enviar." : "El retiro no superó todas las comprobaciones de mínimos, saldos previos, comisión y renta. No se autoriza ninguna firma." };
  } catch (error) {
    console.error("[withdrawal] failed", { stage, vault: input.vaultId, percent: input.percent ?? 100, error: error instanceof Error ? error.message : String(error) });
    return fail(`No se pudo validar el retiro. Etapa: ${stage}. No se firmó ni envió nada; la posición permanece intacta.`);
  }
}