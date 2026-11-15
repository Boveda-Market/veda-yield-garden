import BN from "bn.js";
import { Buffer } from "buffer";
import { ComputeBudgetProgram, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, type TransactionInstruction } from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID, NATIVE_MINT, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { CpAmm } from "@meteora-ag/cp-amm-sdk/dist/index.js";
import { ownsPositionNft } from "@/lib/position-ownership.server";
import { prepareDlmmCompound } from "@/lib/dlmm.server";
import { heliusConnection } from "@/lib/solana-read.server";
import { CHAIN_POOLS, USDC_MINT, tokenAmount } from "@/lib/solana-data";
import { compactDepositInstructions } from "@/lib/compact-deposit";
import { computeBudgetIxs, computeLimit } from "@/lib/compute-budget";
import { compoundLiquidity, compoundSpendValid, type CompoundInput, type CompoundResult } from "@/lib/compound";

/** Adds harvested USDC + pool token to the same owner-verified position; never wraps extra SOL, 0% fee. */
export async function prepareCompound(apiKey: string, input: CompoundInput): Promise<CompoundResult> {
  const startedAt = Date.now();
  const fail = (message: string): CompoundResult => ({ success: false, message });
  try {
    const connection = heliusConnection(apiKey);
    if (await connection.getGenesisHash() !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d") return fail("La conexión no corresponde a la red principal.");
    const config = CHAIN_POOLS.find((p) => p.id === input.vaultId);
    if (!config) return fail("Bóveda no válida.");
    if (config.kind === "dlmm") return prepareDlmmCompound(connection, input);
    const owner = new PublicKey(input.wallet), position = new PublicKey(input.position), usdc = new PublicKey(USDC_MINT);
    const cp = new CpAmm(connection);
    const owned = (await cp.getPositionsByUser(owner)).find((p) => p.position.equals(position));
    if (!owned || owned.positionState.pool.toBase58() !== config.pool) return fail("La posición no pertenece a esta wallet y bóveda.");
    const state = owned.positionState, pool = await cp.fetchPoolState(state.pool);
    if (!pool.tokenAMint.equals(new PublicKey(config.mint)) || !pool.tokenBMint.equals(usdc) || pool.tokenAFlag !== 0 || pool.tokenBFlag !== 0) return fail("Los tokens de esta bóveda no están validados.");
    const usdcAta = getAssociatedTokenAddressSync(usdc, owner), tokenAta = getAssociatedTokenAddressSync(pool.tokenAMint, owner);
    const addresses = [usdcAta, tokenAta, position, owner, state.nftMint, owned.positionNftAccount];
    const before = await connection.getMultipleAccountsInfo(addresses);
    if (!ownsPositionNft(owner, state.nftMint, before[5], before[4])) return fail("No se pudo comprobar que esta posición es tuya.");
    const balance = (data: Buffer | null | undefined, programOwner: string | undefined, mint: PublicKey) => {
      if (!data || programOwner !== TOKEN_PROGRAM_ID.toBase58()) return 0n;
      const d = AccountLayout.decode(data);
      if (!d.mint.equals(mint) || !d.owner.equals(owner) || d.state !== 1) throw new Error("Cuenta inválida");
      return d.amount;
    };
    const usdcBefore = balance(before[0]?.data, before[0]?.owner.toBase58(), usdc), tokenBefore = balance(before[1]?.data, before[1]?.owner.toBase58(), pool.tokenAMint);
    const usdcRaw = BigInt(input.usdcRaw) <= usdcBefore ? BigInt(input.usdcRaw) : usdcBefore;
    const tokenRaw = BigInt(input.tokenRaw) <= tokenBefore ? BigInt(input.tokenRaw) : tokenBefore;
    if (usdcRaw === 0n || tokenRaw === 0n) return fail("Necesitas ambas monedas cosechadas en tu wallet para reinvertir.");
    const quoteBase = { minSqrtPrice: pool.sqrtMinPrice, maxSqrtPrice: pool.sqrtMaxPrice, sqrtPrice: pool.sqrtPrice, collectFeeMode: pool.collectFeeMode, tokenAAmount: pool.tokenAAmount, tokenBAmount: pool.tokenBAmount, liquidity: pool.liquidity };
    const qUsdc = cp.getDepositQuote({ ...quoteBase, inAmount: new BN(usdcRaw.toString()), isTokenA: false });
    const qToken = cp.getDepositQuote({ ...quoteBase, inAmount: new BN(tokenRaw.toString()), isTokenA: true });
    const liquidity = compoundLiquidity({ liquidity: BigInt(qUsdc.liquidityDelta.toString()), tokenNeeded: BigInt(qUsdc.outputAmount.toString()) }, { liquidity: BigInt(qToken.liquidityDelta.toString()) }, tokenRaw);
    if (liquidity <= 0n) return fail("Las ganancias son muy pequeñas para reinvertir.");
    const maxA = new BN(tokenRaw.toString()), maxB = new BN(usdcRaw.toString());
    const tx = await cp.addLiquidity({ owner, position, pool: state.pool, positionNftAccount: owned.positionNftAccount, liquidityDelta: new BN(liquidity.toString()), maxAmountTokenA: maxA, maxAmountTokenB: maxB, tokenAAmountThreshold: maxA, tokenBAmountThreshold: maxB, tokenAMint: pool.tokenAMint, tokenBMint: pool.tokenBMint, tokenAVault: pool.tokenAVault, tokenBVault: pool.tokenBVault, tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID });
    // Use only the already-wrapped harvested SOL: drop SDK wrap (transfer + sync) and unwrap/close.
    const isNative = pool.tokenAMint.equals(NATIVE_MINT);
    const ixs = tx.instructions.filter((ix) => !ix.programId.equals(ComputeBudgetProgram.programId) && !(isNative && (ix.programId.equals(SystemProgram.programId) || (ix.programId.equals(TOKEN_PROGRAM_ID) && (ix.data[0] === 17 || ix.data[0] === 9)))));
    const block = await connection.getLatestBlockhash();
    const simulate = async (instructions: TransactionInstruction[], units = 400_000) => {
      const v = new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: block.blockhash, instructions: compactDepositInstructions([...computeBudgetIxs(units), ...instructions]) }).compileToV0Message());
      if (v.serialize().length > 1232) throw new Error("Tamaño excedido");
      const r = await connection.simulateTransaction(v, { sigVerify: false, accounts: { encoding: "base64", addresses: addresses.map((a) => a.toBase58()) } });
      if (r.value.err || !r.value.accounts) throw new Error("Simulación rechazada");
      return { v, accounts: r.value.accounts, units: r.value.unitsConsumed };
    };
    const sized = await simulate(ixs);
    const final = await simulate(ixs, computeLimit(sized.units));
    const after = (i: number, mint: PublicKey) => { const a = final.accounts[i]; return a?.data[0] ? balance(Buffer.from(a.data[0], "base64"), a.owner, mint) : 0n; };
    const usdcSpent = usdcBefore - after(0, usdc), tokenSpent = tokenBefore - after(1, pool.tokenAMint);
    const positionOpen = (final.accounts[2]?.lamports ?? 0) > 0;
    if (!positionOpen || !compoundSpendValid(usdcSpent, tokenSpent, usdcRaw, tokenRaw)) return fail("La reinversión no superó las comprobaciones. No se pidió ninguna firma.");
    if (Date.now() - startedAt > 45_000) return fail("La preparación tardó demasiado. Repite la revisión.");
    const dec = config.decimals;
    return {
      success: true, message: "Reinversión verificada en simulación. Comisión 0%. Solo tu wallet puede firmar.", tokenSymbol: config.symbol,
      usdcUsed: tokenAmount(usdcSpent.toString(), 6), tokenUsed: tokenAmount(tokenSpent.toString(), dec),
      usdcLeft: tokenAmount((usdcRaw - usdcSpent).toString(), 6), tokenLeft: tokenAmount((tokenRaw - tokenSpent).toString(), dec),
      prepared: { transaction: Buffer.from(final.v.serialize()).toString("base64"), expiresAt: startedAt + 45_000, wallet: input.wallet, position: input.position },
    };
  } catch {
    return fail("No se pudo preparar la reinversión. No se firmó ni envió nada.");
  }
}
