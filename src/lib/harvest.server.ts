import { Buffer } from "buffer";
import { ComputeBudgetProgram, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID, NATIVE_MINT, createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { CpAmm } from "@meteora-ag/cp-amm-sdk/dist/index.js";
import { ownsPositionNft } from "@/lib/position-ownership.server";
import { simulateDlmmHarvest } from "@/lib/dlmm.server";
import { heliusConnection } from "@/lib/solana-read.server";
import { CHAIN_POOLS, USDC_MINT, tokenAmount } from "@/lib/solana-data";
import { FEE_WALLET } from "@/lib/fees";
import { compactDepositInstructions } from "@/lib/compact-deposit";
import { computeBudgetIxs, computeLimit } from "@/lib/compute-budget";
import { harvestAmounts, type HarvestResult } from "@/lib/harvest";
import { type WithdrawalInput } from "@/lib/withdrawal";

/** Owner-verified fee claim: liquidity untouched, the tiered harvest fee on claimed USDC goes to the fee wallet atomically. */
export async function simulateHarvest(apiKey: string, input: WithdrawalInput, options: { prepare?: boolean; maximumFeeRaw?: string } = {}): Promise<HarvestResult> {
  const startedAt = Date.now();
  let stage = "Lectura de posición";
  const fail = (message: string): HarvestResult => ({ success: false, sent: false, message });
  try {
    const connection = heliusConnection(apiKey);
    if (await connection.getGenesisHash() !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d") return fail("La conexión no corresponde a la red principal.");
    const config = CHAIN_POOLS.find((p) => p.id === input.vaultId);
    if (!config) return fail("Bóveda no válida.");
    if (config.kind === "dlmm") return simulateDlmmHarvest(connection, input, options);
    const owner = new PublicKey(input.wallet), position = new PublicKey(input.position), usdc = new PublicKey(USDC_MINT);
    const cp = new CpAmm(connection);
    const owned = (await cp.getPositionsByUser(owner)).find((p) => p.position.equals(position));
    if (!owned || owned.positionState.pool.toBase58() !== config.pool) return fail("La posición no pertenece a esta wallet y bóveda.");
    const state = owned.positionState, pool = await cp.fetchPoolState(state.pool);
    if (!pool.tokenAMint.equals(new PublicKey(config.mint)) || !pool.tokenBMint.equals(usdc) || pool.tokenAFlag !== 0 || pool.tokenBFlag !== 0) return fail("Los tokens o programas de este pool no están validados.");
    const source = getAssociatedTokenAddressSync(usdc, owner), tokenA = getAssociatedTokenAddressSync(pool.tokenAMint, owner);
    const feeOwner = new PublicKey(FEE_WALLET), recipient = getAssociatedTokenAddressSync(usdc, feeOwner);
    if (recipient.equals(source)) return fail("La wallet de recaudo no puede usarse para esta comprobación de comisión.");
    const addresses = [source, tokenA, recipient, position, owner, state.nftMint, owned.positionNftAccount];
    const before = await connection.getMultipleAccountsInfo(addresses);
    if (!ownsPositionNft(owner, state.nftMint, before[6], before[5])) return fail("No se pudo comprobar el NFT de esta posición y su wallet propietaria.");
    const amount = (account: { owner: string; data: string[] } | null | undefined, mint: PublicKey, accountOwner: PublicKey) => {
      if (!account || !account.data[0]) return 0n;
      if (account.owner !== TOKEN_PROGRAM_ID.toBase58()) throw new Error("Programa de cuenta inválido");
      const decoded = AccountLayout.decode(Buffer.from(account.data[0], "base64"));
      if (!decoded.mint.equals(mint) || !decoded.owner.equals(accountOwner) || decoded.state !== 1) throw new Error("Cuenta de token inválida");
      return decoded.amount;
    };
    const asSim = (a: (typeof before)[number]) => a ? { owner: a.owner.toBase58(), data: [Buffer.from(a.data).toString("base64"), "base64"] as [string, string] } : null;
    const usdcBefore = amount(asSim(before[0] ?? null), usdc, owner), aBefore = amount(asSim(before[1] ?? null), pool.tokenAMint, owner), feeBefore = amount(asSim(before[2] ?? null), usdc, feeOwner);
    stage = "Preparación de la cosecha";
    const claim = await cp.claimPositionFee({ owner, position, pool: state.pool, positionNftAccount: owned.positionNftAccount, tokenAMint: pool.tokenAMint, tokenBMint: pool.tokenBMint, tokenAVault: pool.tokenAVault, tokenBVault: pool.tokenBVault, tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID });
    // Keep claimed SOL wrapped; never unwrap or close a preexisting token account.
    const claimIxs = claim.instructions.filter((ix) => !ix.programId.equals(ComputeBudgetProgram.programId) && !(pool.tokenAMint.equals(NATIVE_MINT) && ix.programId.equals(TOKEN_PROGRAM_ID) && ix.data[0] === 9));
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
    const usdcClaimed = amount(claimed.accounts[0], usdc, owner) - usdcBefore;
    const tokenClaimed = amount(claimed.accounts[1], pool.tokenAMint, owner) - aBefore;
    if (usdcClaimed < 0n || tokenClaimed < 0n) return fail("La cosecha consumiría saldos previos; no se autoriza ninguna firma.");
    if (usdcClaimed === 0n && tokenClaimed === 0n) return fail("Esta posición aún no tiene comisiones acumuladas para cosechar.");
    // Tier by capital invested: value the unlocked liquidity in USDC at the pool price (token A converted via sqrtPrice², raw units).
    let positionUsdc = 0n;
    try {
      const q = cp.getWithdrawQuote({ liquidityDelta: state.unlockedLiquidity, sqrtPrice: pool.sqrtPrice, minSqrtPrice: pool.sqrtMinPrice, maxSqrtPrice: pool.sqrtMaxPrice, collectFeeMode: pool.collectFeeMode, tokenAAmount: pool.tokenAAmount, tokenBAmount: pool.tokenBAmount, liquidity: pool.liquidity });
      const sp = BigInt(pool.sqrtPrice.toString());
      positionUsdc = BigInt(q.outAmountB.toString()) + ((BigInt(q.outAmountA.toString()) * sp * sp) >> 128n);
    } catch { positionUsdc = 0n; } // unvalued position falls back to the claim-based tier (never cheaper)
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
    const feeDelta = amount(final.accounts[2], usdc, feeOwner) - feeBefore;
    const netDelta = amount(final.accounts[0], usdc, owner) - usdcBefore;
    const tokenDelta = amount(final.accounts[1], pool.tokenAMint, owner) - aBefore;
    const checks = { position: Boolean(final.accounts[3]) && (final.accounts[3]?.lamports ?? 0) > 0, usdc: netDelta === breakdown.net, fee: feeDelta === breakdown.fee, token: tokenDelta === tokenClaimed };
    const success = Object.values(checks).every(Boolean);
    if (options.prepare && Date.now() - startedAt > 45_000) return fail("La preparación tardó demasiado. Repite la revisión.");
    return {
      success, sent: false, bytes: final.bytes, checks,
      gross: tokenAmount(usdcClaimed.toString(), 6), fee: tokenAmount(feeDelta.toString(), 6), net: tokenAmount(netDelta.toString(), 6), feeRaw: breakdown.fee.toString(), netRaw: netDelta.toString(), tokenRaw: tokenClaimed.toString(),
      tokenSymbol: config.symbol, tokenAmount: tokenAmount(tokenClaimed.toString(), pool.tokenAMint.equals(NATIVE_MINT) ? 9 : 6),
      ...(success && options.prepare ? { prepared: { transaction: Buffer.from(final.tx.serialize()).toString("base64"), expiresAt: startedAt + 45_000, wallet: input.wallet, position: input.position } } : {}),
      message: success ? "Cosecha verificada en simulación. La liquidez principal no se retira. Comisión por niveles sobre los USDC cosechados; la parte en el otro token se entrega sin convertir en esta operación. Solo tu wallet puede firmar y enviar." : "La cosecha no superó todas las comprobaciones. No se autoriza ninguna firma.",
    };
  } catch {
    return fail(`No se pudo validar la cosecha. Etapa: ${stage}. No se firmó ni envió nada.`);
  }
}
