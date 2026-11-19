import BN from "bn.js";
import { Buffer } from "buffer";
import { ComputeBudgetProgram, Keypair, PublicKey, TransactionMessage, VersionedTransaction, type AccountInfo, type AddressLookupTableAccount, type Connection, TransactionInstruction } from "@solana/web3.js";
import { AccountLayout, ExtensionType, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAccount, getAssociatedTokenAddressSync, getExtensionTypes, getMint } from "@solana/spl-token";
import { loadDlmmSdk } from "@/lib/dlmm-sdk.server";
import { CHAIN_POOLS, USDC_MINT, tokenAmount, type ChainPoolConfig, type ChainPosition } from "@/lib/solana-data";
import { FEE_WALLET, harvestFee } from "@/lib/fees";
import { compactDepositInstructions } from "@/lib/compact-deposit";
import { computeBudgetIxs, computeLimit, MAX_COMPUTE_UNITS, networkFeeOf } from "@/lib/compute-budget";
import { simulationAmounts, simulationDisplay, type SimulationInput, type SimulationResult, type SimulationStage } from "@/lib/deposit-simulation";
import type { PreparedPilot } from "@/lib/pilot-deposit";
import { harvestAmounts, type HarvestResult } from "@/lib/harvest";
import { withdrawalAmounts, exitFeeMode, type WithdrawalInput, type WithdrawalResult } from "@/lib/withdrawal";
import { ledgerSwapToUsdc } from "@/lib/ledger-swap.server";
import { rebalanceGainsUsd } from "@/lib/autopilot";
import { compoundSpendValid, type CompoundInput, type CompoundResult } from "@/lib/compound";
import type { RebalanceResult } from "@/lib/dlmm";
import { dlmmRange, dlmmSlippagePct, binsMoved, rebalanceSwapPlan, DLMM_MIN_SOL_LAMPORTS, DLMM_MAX_SWAP_IMPACT_PCT, DLMM_EXIT_MIN_PCT } from "@/lib/dlmm";

type Sdk = Awaited<ReturnType<typeof loadDlmmSdk>>;
type Pool = Awaited<ReturnType<Sdk["DLMM"]["create"]>>;
type DlmmConfig = Extract<ChainPoolConfig, { kind: "dlmm" }>;

export const dlmmConfigs = () => CHAIN_POOLS.filter((p): p is DlmmConfig => p.kind === "dlmm");
export const dlmmConfig = (id: string) => dlmmConfigs().find((p) => p.id === id) ?? null;

/** Token program of the vault token: classic SPL unless the config marks it Token-2022 (validated extensions only). */
export const xProgram = (config: DlmmConfig) => ("tokenProgram" in config && config.tokenProgram === "token2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID);
/** Wallet account of the vault token, derived with its own token program. */
const xAta = (config: DlmmConfig, owner: PublicKey) => getAssociatedTokenAddressSync(new PublicKey(config.mint), owner, false, xProgram(config));
/** Token-2022 extensions that never change amounts or transfers (name/logo only). Anything else (fees, hooks, freeze defaults…) blocks the vault. */
export const SAFE_TOKEN_2022_EXTENSIONS: readonly ExtensionType[] = [ExtensionType.MetadataPointer, ExtensionType.TokenMetadata];
export const token2022ExtensionsSafe = (types: readonly ExtensionType[]) => types.every((t) => SAFE_TOKEN_2022_EXTENSIONS.includes(t));

/** Opens the exact configured pool and re-validates mints, token programs, status and absence of farm rewards. */
async function openPool(connection: Connection, config: DlmmConfig): Promise<{ sdk: Sdk; pool: Pool } | null> {
  const sdk = await loadDlmmSdk();
  const pool = await sdk.DLMM.create(connection, new PublicKey(config.pool));
  const lb = pool.lbPair;
  const valid = pool.pubkey.toBase58() === config.pool
    && lb.tokenXMint.toBase58() === config.mint && lb.tokenYMint.toBase58() === USDC_MINT
    && pool.tokenX.owner.equals(xProgram(config)) && pool.tokenY.owner.equals(TOKEN_PROGRAM_ID)
    && lb.rewardInfos.every((r) => r.mint.equals(PublicKey.default)) && lb.status === 0;
  if (!valid) return null;
  if (xProgram(config).equals(TOKEN_2022_PROGRAM_ID)) {
    // Live re-check: a transfer fee, hook or any other new extension would make amounts unverifiable.
    const mint = await getMint(connection, lb.tokenXMint, "confirmed", TOKEN_2022_PROGRAM_ID).catch(() => null);
    if (!mint || mint.decimals !== config.decimals || mint.freezeAuthority || !token2022ExtensionsSafe(getExtensionTypes(mint.tlvData))) return null;
  }
  return { sdk, pool };
}

/** Integer raw amount from the SDK's decimal strings (never rounds up). */
function rawFloor(value: string | number | { toString(): string }) {
  const text = String(value);
  if (/e/i.test(text)) return BigInt(Math.floor(Number(text)));
  const whole = text.split(".")[0] ?? "0";
  return /^\d+$/.test(whole) ? BigInt(whole) : 0n;
}

/** Live owner/pool/fee-recipient check on the position account itself; locked positions are reported, never hidden. */
async function ownedPosition(connection: Connection, sdk: Sdk, pool: Pool, owner: PublicKey, position: PublicKey) {
  const info = await connection.getAccountInfo(position);
  if (!info || info.lamports <= 0 || !info.owner.equals(pool.program.programId)) return null;
  const wrapped = sdk.wrapPosition(pool.program, position, info);
  const feeOwner = wrapped.feeOwner();
  if (!wrapped.lbPair().equals(pool.pubkey) || !wrapped.owner().equals(owner) || !(feeOwner.equals(PublicKey.default) || feeOwner.equals(owner))) return null;
  const lb = await pool.getPosition(position);
  return { info, wrapped, lb, locked: !new BN(wrapped.lockReleasePoint().toString()).isZero() };
}

/** Positions the wallet owns in validated concentrated-liquidity vaults (amounts in integer token units). */
export async function readDlmmPositions(connection: Connection, wallet: PublicKey): Promise<ChainPosition[]> {
  const out: ChainPosition[] = [];
  for (const config of dlmmConfigs()) {
    const opened = await openPool(connection, config);
    if (!opened) throw new Error("Pool no válido");
    const { activeBin, userPositions } = await opened.pool.getPositionsByUserAndLbPair(wallet);
    for (const p of userPositions) {
      const d = p.positionData;
      if (!d.owner.equals(wallet)) continue;
      const feeOwner = d.feeOwner;
      if (feeOwner && !(feeOwner.equals(PublicKey.default) || feeOwner.equals(wallet))) continue;
      out.push({
        address: p.publicKey.toBase58(), vaultId: config.id, symbol: config.symbol,
        tokenAmount: tokenAmount(rawFloor(d.totalXAmount).toString(), config.decimals), usdcAmount: tokenAmount(rawFloor(d.totalYAmount).toString(), 6),
        feeTokenAmount: tokenAmount(d.feeX.toString(), config.decimals), feeUsdcAmount: tokenAmount(d.feeY.toString(), 6),
        locked: false, // BÓVEDA never locks these; every operation re-checks the live lock point.
        outOfRange: activeBin.binId < d.lowerBinId || activeBin.binId > d.upperBinId,
        ...(activeBin.binId > d.upperBinId ? { priceAbove: true } : {}),
        bins: { lower: d.lowerBinId, upper: d.upperBinId, active: activeBin.binId },
      });
    }
  }
  return out;
}

const MAINNET = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
const stripBudget = (ixs: TransactionInstruction[]) => ixs.filter((ix) => !ix.programId.equals(ComputeBudgetProgram.programId));
type SimAccount = { owner: string; lamports: number; data: string[] } | null | undefined;
function tokenBalance(account: SimAccount, mint: PublicKey, accountOwner: PublicKey, program: PublicKey = TOKEN_PROGRAM_ID) {
  if (!account || !account.data[0]) return 0n;
  if (account.owner !== program.toBase58()) throw new Error("Programa de cuenta inválido");
  // Token-2022 accounts keep the classic 165-byte layout first; extensions (validated on the mint) follow it.
  const decoded = AccountLayout.decode(Buffer.from(account.data[0], "base64").subarray(0, AccountLayout.span));
  if (!decoded.mint.equals(mint) || !decoded.owner.equals(accountOwner) || decoded.state !== 1) throw new Error("Cuenta de token inválida");
  return decoded.amount;
}
const asSim = (a: AccountInfo<Buffer> | null | undefined): SimAccount => a ? { owner: a.owner.toBase58(), lamports: a.lamports, data: [Buffer.from(a.data).toString("base64"), "base64"] } : null;
const log = (scope: string, stage: string, error: unknown) => console.error(`[dlmm-${scope}]`, stage, String(error instanceof Error ? error.message : error).replace(/api-key=[^&\s"]+/gi, "api-key=***").slice(0, 500));

/**
 * One-signature deposit: optional entry fee, half the USDC swapped inside the same pool,
 * then both sides spread evenly (Spot) around the post-swap price. Only the ephemeral position
 * key partially signs, and only when the full simulation verifies the fee, budget and position.
 */
export async function simulateDlmmDeposit(connection: Connection, input: SimulationInput, options: { preparePilot?: boolean } = {}): Promise<SimulationResult & { prepared?: PreparedPilot }> {
  const amounts = simulationAmounts(input.amount, input.migrate === true);
  const display = simulationDisplay(input.amount, input.migrate === true);
  let stage: SimulationStage = "pool";
  let bytes: number | undefined;
  const result = (success: boolean, message: string): SimulationResult => ({ success, stage, message, ...display, sent: false, bytes });
  try {
    if (await connection.getGenesisHash() !== MAINNET) return result(false, "La conexión no corresponde a la red principal.");
    const config = dlmmConfig(input.vaultId);
    if (!config) return result(false, "Bóveda no válida.");
    const opened = await openPool(connection, config);
    if (!opened) return result(false, "Los tokens o programas de este pool no están validados.");
    const { sdk, pool } = opened;
    const owner = new PublicKey(input.wallet), usdc = new PublicKey(USDC_MINT), mintX = new PublicKey(config.mint);
    const source = getAssociatedTokenAddressSync(usdc, owner), tokenX = xAta(config, owner);
    const balance = await getAccount(connection, source).catch(() => null);
    if (!balance || balance.amount < amounts.gross) return result(false, "Tu saldo en dólares no alcanza para este depósito.");
    let existing: Awaited<ReturnType<typeof ownedPosition>> = null;
    if (input.position) {
      existing = await ownedPosition(connection, sdk, pool, owner, new PublicKey(input.position));
      if (!existing) return result(false, "La posición no pertenece a esta wallet y bóveda.");
      if (existing.locked) return result(false, "Esta posición está bloqueada y no admite más depósitos.");
    }
    stage = "reserve";
    if (await connection.getBalance(owner) < (existing ? 10_000_000 : DLMM_MIN_SOL_LAMPORTS)) return result(false, "Esta bóveda necesita una garantía de apertura en tu reserva de operaciones; casi toda vuelve a ti al cerrarla.");

    stage = "jupiter";
    const swapIn = amounts.net / 2n;
    if (swapIn <= 0n) return result(false, "El importe es demasiado pequeño.");
    const binArrays = await pool.getBinArrayForSwap(false, 4);
    const quote = pool.swapQuote(new BN(swapIn.toString()), false, new BN(50), binArrays);
    if (Number(quote.priceImpact.toString()) > DLMM_MAX_SWAP_IMPACT_PCT) return result(false, "Este importe movería demasiado el precio de esta bóveda. Prueba con una cantidad menor.");
    if (quote.minOutAmount.isZero()) return result(false, "No hay liquidez suficiente para este depósito.");
    const active = pool.lbPair.activeId, binStep = pool.lbPair.binStep;
    const moved = binsMoved(Number(sdk.getPriceOfBinByBinId(active, binStep).toString()), Number(quote.endPrice.toString()), binStep);

    stage = "composition";
    let minBinId: number, maxBinId: number;
    if (existing) {
      minBinId = existing.lb.positionData.lowerBinId; maxBinId = existing.lb.positionData.upperBinId;
      if (active + moved < minBinId || active + moved >= maxBinId || active < minBinId) return result(false, "El precio salió del rango de tu posición, así que ya no está generando. Ciérrala y abre una nueva para seguir ganando.");
    } else {
      // Only use bin arrays that already exist: creating new ones costs non-refundable rent.
      const wanted = dlmmRange(active, moved);
      const lowIdx = sdk.binIdToBinArrayIndex(new BN(wanted.min)).toNumber(), highIdx = sdk.binIdToBinArrayIndex(new BN(wanted.max)).toNumber();
      const indexes = Array.from({ length: highIdx - lowIdx + 1 }, (_, i) => lowIdx + i);
      const arrays = await connection.getMultipleAccountsInfo(indexes.map((i) => sdk.deriveBinArray(pool.pubkey, new BN(i), pool.program.programId)[0]));
      const activeIdx = sdk.binIdToBinArrayIndex(new BN(active)).toNumber();
      let lo = activeIdx, hi = activeIdx;
      if (!arrays[activeIdx - lowIdx]) return result(false, "Esta bóveda no tiene liquidez preparada en el precio actual.");
      while (lo - 1 >= lowIdx && arrays[lo - 1 - lowIdx]) lo--;
      while (hi + 1 <= highIdx && arrays[hi + 1 - lowIdx]) hi++;
      minBinId = Math.max(wanted.min, lo * 70); maxBinId = Math.min(wanted.max, hi * 70 + 69);
      if (minBinId >= active || maxBinId <= active + moved) return result(false, "Esta bóveda no tiene liquidez preparada alrededor del precio actual.");
    }
    const slippage = dlmmSlippagePct(moved, binStep);
    const swapTx = await pool.swap({ inToken: usdc, outToken: mintX, inAmount: new BN(swapIn.toString()), minOutAmount: quote.minOutAmount, lbPair: pool.pubkey, user: owner, binArraysPubkey: quote.binArraysPubkey });
    const positionKey = existing ? null : Keypair.generate(); // Ephemeral position identity; partially signs only after verification.
    const positionAddress = existing ? existing.lb.publicKey : positionKey!.publicKey;
    const strategy = { minBinId, maxBinId, strategyType: sdk.StrategyType.Spot };
    const totalYAmount = new BN((amounts.net - swapIn).toString());
    const addTx = existing
      ? await pool.addLiquidityByStrategy({ positionPubKey: positionAddress, totalXAmount: quote.minOutAmount, totalYAmount, strategy, user: owner, slippage })
      : await pool.initializePositionAndAddLiquidityByStrategy({ positionPubKey: positionAddress, totalXAmount: quote.minOutAmount, totalYAmount, strategy, user: owner, slippage });
    const feeOwner = new PublicKey(FEE_WALLET), feeAta = getAssociatedTokenAddressSync(usdc, feeOwner);
    const feeBefore = amounts.fee > 0n ? await getAccount(connection, feeAta).then((a) => a.amount).catch(() => null) : null;
    const feeIxs = amounts.fee > 0n ? [
      ...(feeBefore === null ? [createAssociatedTokenAccountIdempotentInstruction(owner, feeAta, feeOwner, usdc)] : []),
      createTransferCheckedInstruction(source, usdc, feeAta, owner, amounts.fee, 6),
    ] : [];
    const body = stripBudget([...feeIxs, ...swapTx.instructions, ...addTx.instructions]);
    const block = await connection.getLatestBlockhash();
    const compile = (units: number) => new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: block.blockhash, instructions: compactDepositInstructions([...computeBudgetIxs(units), ...body]) }).compileToV0Message());
    let transaction = compile(MAX_COMPUTE_UNITS);
    bytes = transaction.serialize().length;
    if (bytes > 1232) return result(false, "La operación no cabe en una sola firma. No se cobró nada.");

    stage = "simulation";
    const readback = [source, positionAddress, feeAta, owner, tokenX];
    const before = await connection.getMultipleAccountsInfo([owner, tokenX]);
    const sizing = await connection.simulateTransaction(transaction, { sigVerify: false, replaceRecentBlockhash: true });
    if (!sizing.value.err) transaction = compile(computeLimit(sizing.value.unitsConsumed));
    bytes = transaction.serialize().length;
    const simulated = await connection.simulateTransaction(transaction, { sigVerify: false, replaceRecentBlockhash: true, accounts: { encoding: "base64", addresses: readback.map((a) => a.toBase58()) } });
    if (simulated.value.err) return { ...result(false, "La simulación rechazó el depósito. No se firmó ni envió nada; no se cobró comisión."), slot: simulated.context.slot, units: simulated.value.unitsConsumed };
    const [sourceAccount, positionAccount, feeAccount, ownerAccount] = simulated.value.accounts ?? [];
    const feeReceived = amounts.fee === 0n || tokenBalance(feeAccount, usdc, feeOwner) - (feeBefore ?? 0n) === amounts.fee;
    const after = tokenBalance(sourceAccount, usdc, owner);
    const feeVerified = feeReceived && after >= balance.amount - amounts.gross && after <= balance.amount;
    let positionVerified = false, rent = 0n;
    if (positionAccount?.data[0] && positionAccount.owner === pool.program.programId.toBase58()) {
      const state = sdk.wrapPosition(pool.program, positionAddress, { data: Buffer.from(positionAccount.data[0], "base64"), owner: pool.program.programId, lamports: positionAccount.lamports, executable: false } as AccountInfo<Buffer>);
      positionVerified = state.lbPair().equals(pool.pubkey) && state.owner().equals(owner) && state.liquidityShares().some((share) => !share.isZero());
      rent = existing ? 0n : BigInt(positionAccount.lamports);
    }
    // Network budget: only the refundable position, a missing token account and fees may cost reserve.
    const spent = BigInt(before[0]?.lamports ?? 0) - BigInt(ownerAccount?.lamports ?? 0);
    const allowed = rent + (before[1] ? 0n : xProgram(config).equals(TOKEN_2022_PROGRAM_ID) ? 2_074_080n : 2_039_280n) + (feeBefore === null && amounts.fee > 0n ? 2_039_280n : 0n) + 200_000n;
    const budgetVerified = spent <= allowed;
    const verified = feeVerified && positionVerified && budgetVerified;
    const prepared = verified && options.preparePilot ? (() => { if (positionKey) transaction.sign([positionKey]); return { transaction: Buffer.from(transaction.serialize()).toString("base64"), lastValidBlockHeight: block.lastValidBlockHeight, position: positionAddress.toBase58() }; })() : undefined;
    return { ...(prepared ? { prepared } : {}), ...result(verified, verified ? "Simulación satisfactoria: comisión, presupuesto y posición verificados. No se ha movido dinero." : "La simulación no superó todas las comprobaciones; no se autoriza ninguna firma."), slot: simulated.context.slot, units: simulated.value.unitsConsumed, checks: { fee: feeVerified, position: positionVerified && budgetVerified } };
  } catch (error) {
    log("deposit", stage, error);
    return result(false, "No se pudo preparar el depósito en esta bóveda. No se firmó ni envió nada.");
  }
}

/** Owner-verified fee claim; liquidity untouched, tiered fee on claimed USDC, GTA6 fees delivered unconverted. */
export async function simulateDlmmHarvest(connection: Connection, input: WithdrawalInput, options: { prepare?: boolean; maximumFeeRaw?: string } = {}): Promise<HarvestResult> {
  const startedAt = Date.now();
  let stage = "Lectura de posición";
  const fail = (message: string): HarvestResult => ({ success: false, sent: false, message });
  try {
    if (await connection.getGenesisHash() !== MAINNET) return fail("La conexión no corresponde a la red principal.");
    const config = dlmmConfig(input.vaultId);
    if (!config) return fail("Bóveda no válida.");
    const opened = await openPool(connection, config);
    if (!opened) return fail("Los tokens o programas de este pool no están validados.");
    const { sdk, pool } = opened;
    const owner = new PublicKey(input.wallet), position = new PublicKey(input.position), usdc = new PublicKey(USDC_MINT), mintX = new PublicKey(config.mint);
    const owned = await ownedPosition(connection, sdk, pool, owner, position);
    if (!owned) return fail("La posición no pertenece a esta wallet y bóveda.");
    const data = owned.lb.positionData;
    if (data.feeX.isZero() && data.feeY.isZero()) return fail("Esta posición aún no tiene comisiones acumuladas para cosechar.");
    const source = getAssociatedTokenAddressSync(usdc, owner), tokenX = xAta(config, owner);
    const feeOwner = new PublicKey(FEE_WALLET), recipient = getAssociatedTokenAddressSync(usdc, feeOwner);
    if (recipient.equals(source)) return fail("La wallet de recaudo no puede usarse para esta comprobación de comisión.");
    const addresses = [source, tokenX, recipient, position, owner];
    const before = await connection.getMultipleAccountsInfo(addresses);
    const usdcBefore = tokenBalance(asSim(before[0]), usdc, owner), xBefore = tokenBalance(asSim(before[1]), mintX, owner, xProgram(config)), feeBefore = tokenBalance(asSim(before[2]), usdc, feeOwner);
    stage = "Preparación de la cosecha";
    const claims = data.feeX.isZero() && data.feeY.isZero() ? [] : await pool.claimSwapFee({ owner, position: owned.lb });
    if (claims.length !== 1) return fail("Esta cosecha necesitaría varias firmas; no se preparó.");
    const claimIxs = stripBudget(claims[0]!.instructions);
    const block = await connection.getLatestBlockhash();
    const simulate = async (instructions: TransactionInstruction[], units = 400_000) => {
      const tx = new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: block.blockhash, instructions: compactDepositInstructions([...computeBudgetIxs(units), ...instructions]) }).compileToV0Message());
      const bytes = tx.serialize().length;
      if (bytes > 1232) throw new Error("Tamaño excedido");
      const response = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, accounts: { encoding: "base64", addresses: addresses.map((a) => a.toBase58()) } });
      if (response.value.err || !response.value.accounts || response.value.accounts.length !== addresses.length) throw new Error("Simulación rechazada");
      return { tx, accounts: response.value.accounts, bytes, units: response.value.unitsConsumed };
    };
    stage = "Simulación de la cosecha";
    const claimed = await simulate(claimIxs);
    const usdcClaimed = tokenBalance(claimed.accounts[0], usdc, owner) - usdcBefore;
    const tokenClaimed = tokenBalance(claimed.accounts[1], mintX, owner, xProgram(config)) - xBefore;
    if (usdcClaimed < 0n || tokenClaimed < 0n) return fail("La cosecha consumiría saldos previos; no se autoriza ninguna firma.");
    if (usdcClaimed === 0n && tokenClaimed === 0n) return fail("Esta posición aún no tiene comisiones acumuladas para cosechar.");
    // Tier by capital invested: USDC side plus GTA6 side valued at the active bin price (raw units).
    let positionUsdc = 0n;
    try {
      const price = Number(sdk.getPriceOfBinByBinId(pool.lbPair.activeId, pool.lbPair.binStep).toString());
      positionUsdc = rawFloor(data.totalYAmount) + BigInt(Math.floor(Number(rawFloor(data.totalXAmount)) * price));
    } catch { positionUsdc = 0n; }
    const breakdown = harvestAmounts(usdcClaimed, positionUsdc);
    if (options.prepare && (options.maximumFeeRaw === undefined || breakdown.fee > BigInt(options.maximumFeeRaw))) return fail("Las comisiones cambiaron: revisa de nuevo antes de firmar.");
    const instructions = [...claimIxs];
    if (breakdown.fee > 0n) {
      if (!before[2]) instructions.push(createAssociatedTokenAccountIdempotentInstruction(owner, recipient, feeOwner, usdc));
      instructions.push(createTransferCheckedInstruction(source, usdc, recipient, owner, breakdown.fee, 6));
    }
    stage = "Simulación de comisión";
    const sized = await simulate(instructions);
    const final = await simulate(instructions, computeLimit(sized.units));
    const feeDelta = tokenBalance(final.accounts[2], usdc, feeOwner) - feeBefore;
    const netDelta = tokenBalance(final.accounts[0], usdc, owner) - usdcBefore;
    const tokenDelta = tokenBalance(final.accounts[1], mintX, owner, xProgram(config)) - xBefore;
    const checks = { position: (final.accounts[3]?.lamports ?? 0) > 0, usdc: netDelta === breakdown.net, fee: feeDelta === breakdown.fee, token: tokenDelta === tokenClaimed };
    const success = Object.values(checks).every(Boolean);
    if (options.prepare && Date.now() - startedAt > 45_000) return fail("La preparación tardó demasiado. Repite la revisión.");
    return {
      success, sent: false, bytes: final.bytes, checks,
      gross: tokenAmount(usdcClaimed.toString(), 6), fee: tokenAmount(feeDelta.toString(), 6), net: tokenAmount(netDelta.toString(), 6), feeRaw: breakdown.fee.toString(), netRaw: netDelta.toString(), tokenRaw: tokenClaimed.toString(),
      tokenSymbol: config.symbol, tokenAmount: tokenAmount(tokenClaimed.toString(), config.decimals),
      ...(success && options.prepare ? { prepared: { transaction: Buffer.from(final.tx.serialize()).toString("base64"), expiresAt: startedAt + 45_000, wallet: input.wallet, position: input.position } } : {}),
      message: success ? `Cosecha verificada en simulación. Tu dinero sigue en la bóveda; la comisión por niveles se aplica a los dólares cosechados y la parte en ${config.symbol} se entrega sin convertir.` : "La cosecha no superó todas las comprobaciones. No se autoriza ninguna firma.",
    };
  } catch (error) {
    log("harvest", stage, error);
    return fail(`No se pudo validar la cosecha. Etapa: ${stage}. No se firmó ni envió nada.`);
  }
}

/**
 * Owner-verified exit: remove (and on 100% claim + close) inside the exact pool, convert the released
 * GTA6 delta to USDC through a ledger swap with an enforced minimum, and charge the exit fee on the
 * protected minimum. Only the owner signs; rent returns in the network reserve.
 */
export async function simulateDlmmWithdrawal(connection: Connection, input: WithdrawalInput & { percent?: number | undefined; migrate?: true | undefined; rotate?: true | undefined }, options: { prepare?: boolean; maximumFeeRaw?: string; minimumNetRaw?: string } = {}): Promise<WithdrawalResult> {
  const startedAt = Date.now();
  let stage = "Lectura de posición";
  const fail = (message: string, bytes?: number): WithdrawalResult => ({ success: false, sent: false, message, ...(bytes === undefined ? {} : { bytes }) });
  try {
    if (await connection.getGenesisHash() !== MAINNET) return fail("La conexión no corresponde a la red principal.");
    const percent = input.percent ?? 100, full = percent === 100;
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) return fail("Porcentaje de retiro no válido.");
    const config = dlmmConfig(input.vaultId);
    if (!config) return fail("Bóveda no válida.");
    const opened = await openPool(connection, config);
    if (!opened) return fail("Los tokens o programas de este pool no están validados.");
    const { sdk, pool } = opened;
    const owner = new PublicKey(input.wallet), position = new PublicKey(input.position), usdc = new PublicKey(USDC_MINT), mintX = new PublicKey(config.mint);
    const owned = await ownedPosition(connection, sdk, pool, owner, position);
    if (!owned) return fail("La posición no pertenece a esta wallet y bóveda.");
    if (owned.locked) return fail("La posición tiene liquidez bloqueada; no se cerrará ni se prometerá recuperar su renta.");
    const source = getAssociatedTokenAddressSync(usdc, owner), tokenX = xAta(config, owner);
    const feeOwner = new PublicKey(FEE_WALLET), recipient = getAssociatedTokenAddressSync(usdc, feeOwner);
    if (recipient.equals(source)) return fail("La wallet de recaudo no puede usarse para esta comprobación de comisión.");
    const addresses = [source, tokenX, recipient, position, owner];
    const before = await connection.getMultipleAccountsInfo(addresses);
    const usdcBefore = tokenBalance(asSim(before[0]), usdc, owner), xBefore = tokenBalance(asSim(before[1]), mintX, owner, xProgram(config)), feeBefore = tokenBalance(asSim(before[2]), usdc, feeOwner);
    stage = "Preparación del cierre";
    const { lowerBinId, upperBinId } = owned.lb.positionData;
    const removals = await pool.removeLiquidity({ user: owner, position, fromBinId: lowerBinId, toBinId: upperBinId, bps: new BN(percent * 100), shouldClaimAndClose: full });
    if (removals.length !== 1) return fail("Este retiro necesitaría varias firmas; no se preparó.");
    const removalIxs = stripBudget(removals[0]!.instructions);
    const block = await connection.getLatestBlockhash();
    const tables: AddressLookupTableAccount[] = [];
    const simulate = async (instructions: TransactionInstruction[], units = MAX_COMPUTE_UNITS) => {
      const tx = new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: block.blockhash, instructions: compactDepositInstructions([...computeBudgetIxs(units), ...stripBudget(instructions)]) }).compileToV0Message(tables));
      const bytes = tx.serialize().length;
      if (bytes > 1232) throw new Error("Tamaño excedido");
      const fee = { value: await networkFeeOf(connection, tx.message, units) };
      const response = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, accounts: { encoding: "base64", addresses: addresses.map((a) => a.toBase58()) } });
      if (response.value.err || !response.value.accounts || response.value.accounts.length !== addresses.length) throw new Error("Simulación rechazada");
      return { tx, accounts: response.value.accounts, bytes, networkFee: BigInt(fee.value), units: response.value.unitsConsumed };
    };
    stage = "Simulación del cierre";
    const removed = await simulate(removalIxs);
    const xReceived = tokenBalance(removed.accounts[1], mintX, owner, xProgram(config)) - xBefore;
    const yReceived = tokenBalance(removed.accounts[0], usdc, owner) - usdcBefore;
    if (xReceived < 0n || yReceived < 0n) return fail("El retiro consumió tokens ajenos a la posición.");
    // Removal has no on-chain minimum; protect a conservative share of what the simulation released.
    const minimumX = xReceived * BigInt(DLMM_EXIT_MIN_PCT) / 100n, minimumY = yReceived * BigInt(DLMM_EXIT_MIN_PCT) / 100n;
    const instructions = [...removalIxs];
    let minimumSwap = 0n;
    if (xReceived > 0n) {
      stage = "Cotización de conversión";
      const swap = await ledgerSwapToUsdc(connection, { owner, inputMint: config.mint, inputAta: tokenX, usdcAta: source, minimumIn: minimumX, pool: config.pool, allowPool: true });
      if (!swap.ok) return fail(swap.message);
      minimumSwap = swap.minimumSwap;
      instructions.unshift(...swap.setup, swap.ledger);
      instructions.push(swap.route);
      tables.push(...swap.tables);
    }
    stage = "Simulación de conversión a USDC";
    const converted = await simulate(instructions);
    const gross = tokenBalance(converted.accounts[0], usdc, owner) - usdcBefore;
    if (gross <= 0n) return fail("No hay devolución positiva de USDC.");
    const minimumGross = minimumY + minimumSwap;
    const breakdown = withdrawalAmounts(minimumGross, exitFeeMode(input));
    if (minimumGross <= 0n) return fail("No hay un mínimo de USDC protegido.");
    if (options.prepare && (options.maximumFeeRaw === undefined || options.minimumNetRaw === undefined || breakdown.fee > BigInt(options.maximumFeeRaw) * 101n / 100n + 1n || breakdown.net < BigInt(options.minimumNetRaw) * 99n / 100n)) return fail("La cotización cambió: vuelve a revisar el mínimo y la comisión antes de firmar.");
    if (breakdown.fee > 0n) {
      if (!before[2]) instructions.push(createAssociatedTokenAccountIdempotentInstruction(owner, recipient, feeOwner, usdc));
      instructions.push(createTransferCheckedInstruction(source, usdc, recipient, owner, breakdown.fee, 6));
    }
    stage = "Simulación de comisión y renta";
    const sized = await simulate(instructions);
    const final = await simulate(instructions, computeLimit(sized.units));
    const feeDelta = tokenBalance(final.accounts[2], usdc, feeOwner) - feeBefore;
    const netDelta = tokenBalance(final.accounts[0], usdc, owner) - usdcBefore;
    const realizedGross = netDelta + feeDelta;
    if (netDelta < 0n || feeDelta < 0n || realizedGross <= 0n) return fail("La liquidación no conserva los saldos de USDC anteriores; no se autoriza ninguna firma.");
    const remainingToken = tokenBalance(final.accounts[1], mintX, owner, xProgram(config)) - xBefore;
    const closed = full ? !final.accounts[3] || final.accounts[3]?.lamports === 0 : (final.accounts[3]?.lamports ?? 0) > 0;
    const rentLamports = full ? BigInt(before[3]?.lamports ?? 0) : 0n;
    const newAccountRent = [0, 1, 2].reduce((sum, i) => sum + BigInt(before[i] ? 0 : final.accounts[i]?.lamports ?? 0), 0n);
    const solDelta = BigInt(final.accounts[4]?.lamports ?? 0) - BigInt(before[4]?.lamports ?? 0);
    const checks = { closed, usdc: remainingToken === 0n && netDelta >= breakdown.net && realizedGross >= minimumGross, fee: feeDelta === breakdown.fee, rent: closed && (full ? rentLamports > 0n : true) && solDelta + newAccountRent + final.networkFee === rentLamports };
    const success = Object.values(checks).every(Boolean);
    if (options.prepare && Date.now() - startedAt > 45_000) return fail("La preparación tardó demasiado. Repite la revisión para obtener una transacción reciente.");
    return { success, sent: false, bytes: final.bytes, checks, gross: tokenAmount(realizedGross.toString(), 6), fee: tokenAmount(feeDelta.toString(), 6), net: tokenAmount(netDelta.toString(), 6), expectedFee: tokenAmount(breakdown.fee.toString(), 6), minimumGross: tokenAmount(minimumGross.toString(), 6), minimumNet: tokenAmount(breakdown.net.toString(), 6), feeRaw: breakdown.fee.toString(), minimumNetRaw: breakdown.net.toString(), remainingTokenRaw: remainingToken.toString(), rentSol: tokenAmount(rentLamports.toString(), 9), ...(success && options.prepare ? { prepared: { transaction: Buffer.from(final.tx.serialize()).toString("base64"), expiresAt: startedAt + 45_000, lastValidBlockHeight: block.lastValidBlockHeight, wallet: input.wallet, position: input.position } } : {}), message: success && !full ? `Retiro parcial del ${percent}% verificado en simulación. Tu posición sigue abierta con el resto. Solo tu wallet puede firmar y enviar.` : success ? "Retiro verificado en simulación. Todo se convierte a dólares en la misma operación y la reserva de la posición vuelve a tu cuenta. Solo tu wallet puede firmar y enviar." : "El retiro no superó todas las comprobaciones de mínimos, saldos previos, comisión y renta. No se autoriza ninguna firma." };
  } catch (error) {
    log("withdrawal", stage, error);
    return fail(`No se pudo validar el retiro. Etapa: ${stage}. No se firmó ni envió nada; la posición permanece intacta.`);
  }
}

/** Adds already-harvested USDC + GTA6 to the same in-range position; 0% fee, never spends more than was harvested. */
export async function prepareDlmmCompound(connection: Connection, input: CompoundInput): Promise<CompoundResult> {
  const startedAt = Date.now();
  const fail = (message: string): CompoundResult => ({ success: false, message });
  try {
    if (await connection.getGenesisHash() !== MAINNET) return fail("La conexión no corresponde a la red principal.");
    const config = dlmmConfig(input.vaultId);
    if (!config) return fail("Bóveda no válida.");
    const opened = await openPool(connection, config);
    if (!opened) return fail("Los tokens o programas de este pool no están validados.");
    const { sdk, pool } = opened;
    const owner = new PublicKey(input.wallet), position = new PublicKey(input.position), usdc = new PublicKey(USDC_MINT), mintX = new PublicKey(config.mint);
    const owned = await ownedPosition(connection, sdk, pool, owner, position);
    if (!owned) return fail("No se pudo comprobar que esta posición es tuya.");
    if (owned.locked) return fail("Esta posición está bloqueada y no admite reinversión.");
    const { lowerBinId, upperBinId } = owned.lb.positionData, active = pool.lbPair.activeId;
    if (active < lowerBinId || active >= upperBinId) return fail("El precio salió del rango de tu posición; tus ganancias quedan en tu wallet.");
    const source = getAssociatedTokenAddressSync(usdc, owner), tokenX = xAta(config, owner);
    const addresses = [source, tokenX, position];
    const before = await connection.getMultipleAccountsInfo(addresses);
    const usdcBefore = tokenBalance(asSim(before[0]), usdc, owner), tokenBefore = tokenBalance(asSim(before[1]), mintX, owner, xProgram(config));
    const usdcRaw = BigInt(input.usdcRaw) <= usdcBefore ? BigInt(input.usdcRaw) : usdcBefore;
    const tokenRaw = BigInt(input.tokenRaw) <= tokenBefore ? BigInt(input.tokenRaw) : tokenBefore;
    if (usdcRaw === 0n || tokenRaw === 0n) return fail("Necesitas ambas monedas cosechadas en tu wallet para reinvertir.");
    const tx = await pool.addLiquidityByStrategy({ positionPubKey: position, totalXAmount: new BN((tokenRaw * 99n / 100n).toString()), totalYAmount: new BN((usdcRaw * 99n / 100n).toString()), strategy: { minBinId: lowerBinId, maxBinId: upperBinId, strategyType: sdk.StrategyType.Spot }, user: owner, slippage: dlmmSlippagePct(0, pool.lbPair.binStep) });
    const ixs = stripBudget(tx.instructions);
    const block = await connection.getLatestBlockhash();
    const simulate = async (instructions: TransactionInstruction[], units = 600_000) => {
      const v = new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: block.blockhash, instructions: compactDepositInstructions([...computeBudgetIxs(units), ...instructions]) }).compileToV0Message());
      if (v.serialize().length > 1232) throw new Error("Tamaño excedido");
      const r = await connection.simulateTransaction(v, { sigVerify: false, replaceRecentBlockhash: true, accounts: { encoding: "base64", addresses: addresses.map((a) => a.toBase58()) } });
      if (r.value.err || !r.value.accounts) throw new Error("Simulación rechazada");
      return { v, accounts: r.value.accounts, units: r.value.unitsConsumed };
    };
    const sized = await simulate(ixs);
    const final = await simulate(ixs, computeLimit(sized.units));
    const usdcSpent = usdcBefore - tokenBalance(final.accounts[0], usdc, owner), tokenSpent = tokenBefore - tokenBalance(final.accounts[1], mintX, owner, xProgram(config));
    if ((final.accounts[2]?.lamports ?? 0) <= 0 || !compoundSpendValid(usdcSpent, tokenSpent, usdcRaw, tokenRaw)) return fail("La reinversión no superó las comprobaciones. No se pidió ninguna firma.");
    if (Date.now() - startedAt > 45_000) return fail("La preparación tardó demasiado. Repite la revisión.");
    return {
      success: true, message: "Reinversión verificada en simulación. Comisión 0%. Solo tu wallet puede firmar.", tokenSymbol: config.symbol,
      usdcUsed: tokenAmount(usdcSpent.toString(), 6), tokenUsed: tokenAmount(tokenSpent.toString(), config.decimals),
      usdcLeft: tokenAmount((usdcRaw - usdcSpent).toString(), 6), tokenLeft: tokenAmount((tokenRaw - tokenSpent).toString(), config.decimals),
      prepared: { transaction: Buffer.from(final.v.serialize()).toString("base64"), expiresAt: startedAt + 45_000, wallet: input.wallet, position: input.position },
    };
  } catch (error) {
    log("compound", "", error);
    return fail("No se pudo preparar la reinversión. No se firmó ni envió nada.");
  }
}

export type { RebalanceResult } from "@/lib/dlmm";

/**
 * One-signature 50/50 rebalance of an owner-verified range position: claim fees, remove all liquidity,
 * swap half the excess side inside the same pool, then re-centre the same position on the current price
 * with everything (capital + fees). Tiered harvest fee on the claimed USDC only (same tiers as harvest) goes to the fee ATA; only the owner signs; the wallet never loses prior balances.
 */
export async function simulateDlmmRebalance(connection: Connection, input: WithdrawalInput, options: { prepare?: boolean; maxImpactPct?: number; memo?: string; absorbWalletToken?: boolean; absorbUsdc?: bigint } = {}): Promise<RebalanceResult> {
  const startedAt = Date.now();
  let stage = "Lectura de posición";
  const fail = (message: string): RebalanceResult => ({ success: false, message });
  try {
    if (await connection.getGenesisHash() !== MAINNET) return fail("La conexión no corresponde a la red principal.");
    const config = dlmmConfig(input.vaultId);
    if (!config) return fail("Esta bóveda no admite rebalanceo.");
    const opened = await openPool(connection, config);
    if (!opened) return fail("Los tokens o programas de este pool no están validados.");
    const { sdk, pool } = opened;
    const owner = new PublicKey(input.wallet), position = new PublicKey(input.position), usdc = new PublicKey(USDC_MINT), mintX = new PublicKey(config.mint);
    const owned = await ownedPosition(connection, sdk, pool, owner, position);
    if (!owned) return fail("La posición no pertenece a esta wallet y bóveda.");
    if (owned.locked) return fail("Esta posición está bloqueada y no se puede rebalancear.");
    const data = owned.lb.positionData;
    const active = pool.lbPair.activeId;
    if (active >= data.lowerBinId && active <= data.upperBinId) return fail("Tu posición está dentro del rango y ya genera ganancias; no necesita rebalanceo.");
    const xAll = rawFloor(data.totalXAmount) + BigInt(data.feeX.toString()), yAll = rawFloor(data.totalYAmount) + BigInt(data.feeY.toString());
    if (xAll === 0n && yAll === 0n) return fail("Esta posición no tiene saldo para rebalancear.");
    const price = Number(sdk.getPriceOfBinByBinId(active, pool.lbPair.binStep).toString());
    const usdcAta = getAssociatedTokenAddressSync(usdc, owner), tokenX = xAta(config, owner);
    const feeAta = getAssociatedTokenAddressSync(usdc, new PublicKey(FEE_WALLET));
    const addresses = [usdcAta, tokenX, position, owner, feeAta];
    const before = await connection.getMultipleAccountsInfo(addresses);
    // Tiered harvest fee on the claimed USDC (tier by harvested amount); skipped if the treasury USDC account is missing.
    const positionUnits = BigInt(Math.floor(Number(xAll) * price)) + yAll;
    const bovedaFee = before[4] ? harvestFee(BigInt(data.feeY.toString()), positionUnits) : 0n;
    const usdcBefore = tokenBalance(asSim(before[0]), usdc, owner), xBefore = tokenBalance(asSim(before[1]), mintX, owner, xProgram(config));
    // Autopilot: leftover vault tokens already in the wallet join the re-centred position (never USDC, never SOL).
    const absorbedX = options.absorbWalletToken ? xBefore : 0n;
    // Autopilot: USDC just converted from verified leftovers joins too (capped to what the wallet holds).
    const absorbedY = options.absorbUsdc && options.absorbUsdc > 0n ? (options.absorbUsdc < usdcBefore ? options.absorbUsdc : usdcBefore) : 0n;
    const x = xAll + absorbedX, y = yAll - bovedaFee + absorbedY;
    if (await connection.getBalance(owner) < 10_000_000) return fail("Necesitas un poco más de reserva de operaciones para rebalancear.");

    stage = "Preparación del rebalanceo";
    const claims = data.feeX.isZero() && data.feeY.isZero() ? [] : await pool.claimSwapFee({ owner, position: owned.lb });
    const removals = await pool.removeLiquidity({ user: owner, position, fromBinId: data.lowerBinId, toBinId: data.upperBinId, bps: new BN(10_000), shouldClaimAndClose: false });
    if (claims.length > 1 || removals.length !== 1) return fail("Este rebalanceo necesitaría varias firmas; no se preparó.");
    // Withdrawn amounts are SDK estimates; keep a small margin so the swap never touches prior wallet balances.
    const plan = rebalanceSwapPlan(x * 995n / 1000n, y * 995n / 1000n, price);
    let swapIxs: TransactionInstruction[] = [], outMin = 0n;
    if (plan.amountIn > 0n) {
      stage = "Cotización del intercambio";
      const binArrays = await pool.getBinArrayForSwap(plan.swapForY, 4);
      const quote = pool.swapQuote(new BN(plan.amountIn.toString()), plan.swapForY, new BN(100), binArrays);
      if (Number(quote.priceImpact.toString()) > (options.maxImpactPct ?? DLMM_MAX_SWAP_IMPACT_PCT)) return fail("Ahora mismo el rebalanceo movería demasiado el precio de esta bóveda. Prueba en unos minutos.");
      if (quote.minOutAmount.isZero()) return fail("No hay liquidez suficiente para rebalancear ahora.");
      outMin = BigInt(quote.minOutAmount.toString());
      const [inToken, outToken] = plan.swapForY ? [mintX, usdc] : [usdc, mintX];
      const swapTx = await pool.swap({ inToken, outToken, inAmount: new BN(plan.amountIn.toString()), minOutAmount: quote.minOutAmount, lbPair: pool.pubkey, user: owner, binArraysPubkey: quote.binArraysPubkey });
      swapIxs = stripBudget(swapTx.instructions);
    }
    const depX = (plan.swapForY ? x - plan.amountIn : x + outMin) * 99n / 100n;
    const depY = (plan.swapForY ? y + outMin : y - plan.amountIn) * 99n / 100n;
    if (depX <= 0n && depY <= 0n) return fail("El saldo es demasiado pequeño para rebalancear.");
    stage = "Nuevo rango centrado";
    // Snapshot of the same position after the removal: no liquidity and no fees left.
    const emptied = { ...data, totalXAmount: "0", totalYAmount: "0", feeX: new BN(0), feeY: new BN(0), rewardOne: new BN(0), rewardTwo: new BN(0), positionBinData: data.positionBinData.map((b) => ({ ...b, positionXAmount: "0", positionYAmount: "0", positionFeeXAmount: "0", positionFeeYAmount: "0", positionLiquidity: "0" })) } as typeof data;
    const plannedRebalance = await pool.simulateRebalancePositionWithBalancedStrategy(position, emptied, sdk.StrategyType.Spot, new BN(depX.toString()), new BN(depY.toString()), new BN(0), new BN(0));
    if (plannedRebalance.binArrayCount > 0) return fail("El precio actual está en una zona sin liquidez preparada; rebalancear costaría una reserva extra no recuperable. Prueba más tarde.");
    const rebalance = await pool.rebalancePosition(plannedRebalance, new BN(3), owner, 1);
    if (rebalance.initBinArrayInstructions.length) return fail("El precio actual está en una zona sin liquidez preparada. Prueba más tarde.");
    const feeIxs = bovedaFee > 0n ? [createTransferCheckedInstruction(usdcAta, usdc, feeAta, owner, bovedaFee, 6)] : [];
    const core = stripBudget([...(claims[0]?.instructions ?? []), ...removals[0]!.instructions, ...feeIxs, ...swapIxs, ...rebalance.rebalancePositionInstruction]);
    const block = await connection.getLatestBlockhash();
    // Optional on-chain tag (Autopilot) so activity can name it; dropped when it would exceed the size limit.
    const memoIx = options.memo ? new TransactionInstruction({ programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"), keys: [], data: Buffer.from(options.memo) }) : null;
    const fits = (ixs: TransactionInstruction[]) => { try { return new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: block.blockhash, instructions: compactDepositInstructions([...computeBudgetIxs(MAX_COMPUTE_UNITS), ...ixs]) }).compileToV0Message()).serialize().length <= 1232; } catch { return false; } };
    const instructions = memoIx && fits([...core, memoIx]) ? [...core, memoIx] : core;
    const simulate = async (units = MAX_COMPUTE_UNITS) => {
      const tx = new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: block.blockhash, instructions: compactDepositInstructions([...computeBudgetIxs(units), ...instructions]) }).compileToV0Message());
      if (tx.serialize().length > 1232) throw new Error("Tamaño excedido");
      const fee = { value: await networkFeeOf(connection, tx.message, units) };
      const r = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, accounts: { encoding: "base64", addresses: addresses.map((a) => a.toBase58()) } });
      if (r.value.err || !r.value.accounts || r.value.accounts.length !== addresses.length) throw new Error(`Simulación rechazada ${JSON.stringify(r.value.err)}`);
      return { tx, accounts: r.value.accounts, units: r.value.unitsConsumed, networkFee: fee.value };
    };
    stage = "Simulación del rebalanceo";
    const sized = await simulate();
    const final = await simulate(computeLimit(sized.units));
    const usdcLeft = tokenBalance(final.accounts[0], usdc, owner) - (usdcBefore - absorbedY), tokenLeft = tokenBalance(final.accounts[1], mintX, owner, xProgram(config)) - (xBefore - absorbedX);
    const pa = final.accounts[2];
    let rangeOk = false;
    if (pa?.data[0] && pa.owner === pool.program.programId.toBase58()) {
      const state = sdk.wrapPosition(pool.program, position, { data: Buffer.from(pa.data[0], "base64"), owner: pool.program.programId, lamports: pa.lamports, executable: false } as AccountInfo<Buffer>);
      rangeOk = state.lbPair().equals(pool.pubkey) && state.owner().equals(owner) && state.lowerBinId().toNumber() <= active && state.upperBinId().toNumber() >= active && state.liquidityShares().some((s) => !s.isZero());
    }
    const solSpent = BigInt(before[3]?.lamports ?? 0) - BigInt(final.accounts[3]?.lamports ?? 0);
    const newAtaRent = [0, 1].reduce((sum, i) => sum + BigInt(before[i] ? 0 : final.accounts[i]?.lamports ?? 0), 0n);
    const feeDelta = before[4] ? tokenBalance(final.accounts[4], usdc, new PublicKey(FEE_WALLET)) - tokenBalance(asSim(before[4]), usdc, new PublicKey(FEE_WALLET)) : 0n;
    const checks = { range: rangeOk, fee: feeDelta === bovedaFee, balances: usdcLeft >= 0n && tokenLeft >= 0n, budget: solSpent <= final.networkFee + newAtaRent + 2_000_000n };
    const success = Object.values(checks).every(Boolean);
    if (!success) { log("rebalance", "checks", JSON.stringify({ ...checks, solSpent: solSpent.toString() })); return fail("El rebalanceo no superó todas las comprobaciones. No se pidió ninguna firma."); }
    if (options.prepare && Date.now() - startedAt > 45_000) return fail("La preparación tardó demasiado. Repite la revisión.");
    const valueUsd = (Number(x) * price + Number(y)) / 1e6;
    const gainsAddedUsd = rebalanceGainsUsd(BigInt(data.feeX.toString()), BigInt(data.feeY.toString()), absorbedX, price, bovedaFee) + Number(absorbedY) / 1e6;
    return {
      success: true, tokenSymbol: config.symbol, valueUsd: valueUsd.toFixed(2),
      feesUsdc: tokenAmount(data.feeY.toString(), 6), feesToken: tokenAmount(data.feeX.toString(), config.decimals),
      usdcLeft: tokenAmount(usdcLeft.toString(), 6), tokenLeft: tokenAmount(tokenLeft.toString(), config.decimals),
      swapped: plan.amountIn === 0n ? "none" : plan.swapForY ? "token" : "usdc",
      bovedaFeeUsdc: tokenAmount(bovedaFee.toString(), 6), gainsAddedUsd: gainsAddedUsd.toFixed(2),
      message: "Rebalanceo verificado en simulación: tus ganancias se suman y tu posición vuelve a quedar centrada en el precio actual. Solo tu wallet puede firmar.",
      ...(options.prepare ? { prepared: { transaction: Buffer.from(final.tx.serialize()).toString("base64"), expiresAt: startedAt + 45_000, lastValidBlockHeight: block.lastValidBlockHeight, wallet: input.wallet, position: input.position } } : {}),
    };
  } catch (error) {
    log("rebalance", stage, error);
    return fail(`No se pudo preparar el rebalanceo. Etapa: ${stage}. No se firmó ni envió nada; tu posición sigue intacta.`);
  }
}
