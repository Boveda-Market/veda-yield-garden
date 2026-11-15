import BN from "bn.js";
import { Buffer } from "buffer";
import { z } from "zod";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, SystemInstruction, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount, TOKEN_PROGRAM_ID, AccountLayout, NATIVE_MINT, createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction } from "@solana/spl-token";
import { FEE_WALLET } from "@/lib/fees";
import { CpAmm, derivePositionAddress, cpAmmCoder } from "@meteora-ag/cp-amm-sdk/dist/index.js";
import { heliusConnection } from "@/lib/solana-read.server";
import { CHAIN_POOLS, USDC_MINT, solanaAddressSchema } from "@/lib/solana-data";
import { simulationAmounts, simulationDisplay, type SimulationInput, type SimulationResult, type SimulationStage } from "@/lib/deposit-simulation";
import { compactDepositInstructions } from "@/lib/compact-deposit";
import { computeBudgetIxs, computeLimit, MAX_COMPUTE_UNITS } from "@/lib/compute-budget";
import { pilotInput, type PreparedPilot } from "@/lib/pilot-deposit";
import { ownsPositionNft } from "@/lib/position-ownership.server";
import { simulateDlmmDeposit } from "@/lib/dlmm.server";

const ixSchema = z.object({ programId: solanaAddressSchema, accounts: z.array(z.object({ pubkey: solanaAddressSchema, isSigner: z.boolean(), isWritable: z.boolean() })).max(128), data: z.string().max(20_000) });
const swapSchema = z.object({ setupInstructions: z.array(ixSchema), swapInstruction: ixSchema, cleanupInstruction: ixSchema.nullable().optional(), otherInstructions: z.array(ixSchema).optional(), addressLookupTableAddresses: z.array(solanaAddressSchema).max(16) });
const quoteSchema = z.object({ inputMint: z.string(), outputMint: z.string(), inAmount: z.string().regex(/^\d+$/), outAmount: z.string().regex(/^\d+$/), otherAmountThreshold: z.string().regex(/^\d+$/), swapMode: z.literal("ExactIn") }).passthrough();

export const MIN_SOL_LAMPORTS = 15_000_000;

async function jupiter(path: string, body?: unknown) {
  // The keyless Jupiter API rate-limits bursts; back off on 429 only.
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`https://api.jup.ag/swap/v1/${path}`, {
      method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 429 && attempt < 5) { await new Promise((resolve) => setTimeout(resolve, 1_200 * (attempt + 1))); continue; }
    if (!response.ok) throw new Error(`Jupiter no está disponible para esta simulación (${response.status})`);
    return response.json();
  }
}

/** Read-only: no signatures, transaction bytes returned, broadcasting or funding overrides. */
export async function simulateDeposit(apiKey: string, input: SimulationInput, options: { preparePilot?: boolean } = {}): Promise<SimulationResult & { prepared?: PreparedPilot }> {
  // Validate the amount and eligible vaults again at the signing boundary.
  if (options.preparePilot) pilotInput.parse(input);
  const amounts = simulationAmounts(input.amount, input.migrate === true);
  const display = simulationDisplay(input.amount, input.migrate === true);
  let stage: SimulationStage = "pool";
  let bytes: number | undefined;
  const result = (success: boolean, message: string): SimulationResult => ({ success, stage, message, ...display, sent: false, bytes });
  try {
    const connection = heliusConnection(apiKey);
    if (await connection.getGenesisHash() !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d") return result(false, "La conexión no corresponde a Solana Mainnet.");
    const config = CHAIN_POOLS.find((pool) => pool.id === input.vaultId);
    if (!config) return result(false, "Bóveda no válida.");
    if (config.kind === "dlmm") return simulateDlmmDeposit(connection, input, options);
    const owner = new PublicKey(input.wallet);
    const usdc = new PublicKey(USDC_MINT);
    const cp = new CpAmm(connection);
    const poolAddress = new PublicKey(config.pool);
    const pool = await cp.fetchPoolState(poolAddress);
    if (!pool.tokenAMint.equals(new PublicKey(config.mint)) || !pool.tokenBMint.equals(usdc)) return result(false, "Los tokens del pool no coinciden con esta bóveda.");
    // Extension-adjusted transfer amounts are not yet independently verified.
    if (pool.tokenAFlag !== 0 || pool.tokenBFlag !== 0) return result(false, "Este pool utiliza Token-2022; la simulación queda pendiente de validar sus extensiones.");
    const source = getAssociatedTokenAddressSync(usdc, owner);
    const balance = await getAccount(connection, source).catch(() => null);
    if (!balance || balance.amount < amounts.gross) return result(false, "La cuenta USDC asociada de esta wallet no tiene el importe necesario. No se inventan saldos para simular.");

    // Meteora opens a position account, NFT mint and NFT account (~0.0099 SOL
    // refundable rent) plus temporary token accounts and network fees.
    if (await connection.getBalance(owner) < MIN_SOL_LAMPORTS) { stage = "reserve"; return result(false, "Esta bóveda necesita una pequeña garantía de apertura en tu reserva de operaciones; casi toda vuelve a ti al cerrarla."); }
    stage = "jupiter";
    // Quote against the pool's actual ratio rather than assuming a 50/50 pool.
    // Binary search balances remaining USDC against the other token required.
    let low = 1n, high = amounts.net - 1n;
    let selected: { quote: z.infer<typeof quoteSchema>; minimum: BN; remaining: BN } | undefined;
    for (let iteration = 0; iteration < 7 && low <= high; iteration++) {
      const swapAmount = (low + high) / 2n;
      const params = new URLSearchParams({ inputMint: USDC_MINT, outputMint: config.mint, amount: swapAmount.toString(), slippageBps: "50", maxAccounts: "24", onlyDirectRoutes: "true", excludeDexes: "Meteora,Meteora DLMM,Meteora DAMM v2" });
      const quote = quoteSchema.parse(await jupiter(`quote?${params}`));
      if (quote.inputMint !== USDC_MINT || quote.outputMint !== config.mint || quote.inAmount !== swapAmount.toString()) throw new Error("Cotización no válida");
      // Reject a route touching the target pool: it would invalidate deposit state.
      const routes = z.array(z.object({ swapInfo: z.object({ ammKey: z.string() }) })).parse(quote["routePlan"]);
      if (routes.some((route) => route.swapInfo.ammKey === config.pool)) throw new Error("La ruta altera el pool de destino");
      const minimum = new BN(quote.otherAmountThreshold);
      const remaining = new BN((amounts.net - swapAmount).toString());
      const depositQuote = cp.getDepositQuote({ inAmount: remaining, isTokenA: false, minSqrtPrice: pool.sqrtMinPrice, maxSqrtPrice: pool.sqrtMaxPrice, sqrtPrice: pool.sqrtPrice, collectFeeMode: pool.collectFeeMode, tokenAAmount: pool.tokenAAmount, tokenBAmount: pool.tokenBAmount, liquidity: pool.liquidity });
      selected = { quote, minimum, remaining };
      if (minimum.lt(depositQuote.outputAmount)) low = swapAmount + 1n;
      else high = swapAmount - 1n;
    }
    if (!selected || selected.minimum.isZero()) return result(false, "Jupiter no ofreció una ruta utilizable.");
    const swap = swapSchema.parse(await jupiter("swap-instructions", { quoteResponse: selected.quote, userPublicKey: input.wallet, wrapAndUnwrapSol: false, dynamicComputeUnitLimit: false }));
    const decodeIx = (ix: z.infer<typeof ixSchema>) => new TransactionInstruction({ programId: new PublicKey(ix.programId), keys: ix.accounts.map((account) => ({ ...account, pubkey: new PublicKey(account.pubkey) })), data: Buffer.from(ix.data, "base64") });

    stage = "composition";
    const liquidity = cp.getLiquidityDelta({ maxAmountTokenA: selected.minimum, maxAmountTokenB: selected.remaining, sqrtPrice: pool.sqrtPrice, sqrtMinPrice: pool.sqrtMinPrice, sqrtMaxPrice: pool.sqrtMaxPrice, collectFeeMode: pool.collectFeeMode, tokenAAmount: pool.tokenAAmount, tokenBAmount: pool.tokenBAmount, liquidity: pool.liquidity });
    if (liquidity.isZero()) return result(false, "El importe no produce liquidez depositable.");
    // Reserve 0.5% headroom within the swap minimum and remaining USDC caps.
    const depositLiquidity = liquidity.muln(995).divn(1000);
    const nft = Keypair.generate(); // Ephemeral public identity only; never sign.
    // "Depositar más": add to the same owner-verified position instead of opening a new one.
    let existing: { position: PublicKey; nftMint: PublicKey } | null = null;
    let deposit;
    if (input.position) {
      const position = new PublicKey(input.position);
      const owned = (await cp.getPositionsByUser(owner)).find((p) => p.position.equals(position));
      if (!owned || !owned.positionState.pool.equals(poolAddress)) return result(false, "La posición no pertenece a esta wallet y bóveda.");
      const [nftAccount, nftMint] = await connection.getMultipleAccountsInfo([owned.positionNftAccount, owned.positionState.nftMint]);
      if (!ownsPositionNft(owner, owned.positionState.nftMint, nftAccount, nftMint)) return result(false, "No se pudo comprobar que esta posición es tuya.");
      existing = { position, nftMint: owned.positionState.nftMint };
      deposit = await cp.addLiquidity({ owner, position, pool: poolAddress, positionNftAccount: owned.positionNftAccount, liquidityDelta: depositLiquidity, maxAmountTokenA: selected.minimum, maxAmountTokenB: selected.remaining, tokenAAmountThreshold: selected.minimum, tokenBAmountThreshold: selected.remaining, tokenAMint: pool.tokenAMint, tokenBMint: pool.tokenBMint, tokenAVault: pool.tokenAVault, tokenBVault: pool.tokenBVault, tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID });
    } else {
      deposit = await cp.createPositionAndAddLiquidity({ owner, pool: poolAddress, positionNft: nft.publicKey, liquidityDelta: depositLiquidity, maxAmountTokenA: selected.minimum, maxAmountTokenB: selected.remaining, tokenAAmountThreshold: selected.minimum, tokenBAmountThreshold: selected.remaining, tokenAMint: pool.tokenAMint, tokenBMint: pool.tokenBMint, tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID });
    }
    const swapIxs = [...swap.setupInstructions, ...(swap.otherInstructions ?? []), swap.swapInstruction].map(decodeIx);
    // Jupiter supplies wrapped SOL already. Do not wrap additional wallet SOL.
    const depositIxs = deposit.instructions.filter((ix) => {
      if (!pool.tokenAMint.equals(NATIVE_MINT) || !ix.programId.equals(SystemProgram.programId)) return true;
      if (SystemInstruction.decodeInstructionType(ix) !== "Transfer") return true;
      const transfer = SystemInstruction.decodeTransfer(ix);
      return !transfer.toPubkey.equals(getAssociatedTokenAddressSync(NATIVE_MINT, owner));
    });
    // Entry fee (0.5% above 5 USDC) moves atomically to the fee wallet; none when zero.
    const feeOwner = new PublicKey(FEE_WALLET);
    const feeAta = getAssociatedTokenAddressSync(usdc, feeOwner);
    const feeBefore = amounts.fee > 0n ? await getAccount(connection, feeAta).then((a) => a.amount).catch(() => null) : null;
    const feeIxs = amounts.fee > 0n ? [
      ...(feeBefore === null ? [createAssociatedTokenAccountIdempotentInstruction(owner, feeAta, feeOwner, usdc)] : []),
      createTransferCheckedInstruction(source, usdc, feeAta, owner, amounts.fee, 6),
    ] : [];
    const body = [...feeIxs, ...swapIxs, ...depositIxs, ...(swap.cleanupInstruction ? [decodeIx(swap.cleanupInstruction)] : [])].filter((ix) => !ix.programId.equals(ComputeBudgetProgram.programId));
    const build = (units: number) => compactDepositInstructions([...computeBudgetIxs(units), ...body]);
    const tables = await Promise.all(swap.addressLookupTableAddresses.map(async (address) => {
      const table = await connection.getAddressLookupTable(new PublicKey(address));
      if (!table.value) throw new Error("Tabla de direcciones no disponible");
      return table.value;
    }));
    const block = await connection.getLatestBlockhash();
    const compile = (units: number) => new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: block.blockhash, instructions: build(units) }).compileToV0Message(tables));
    let transaction = compile(MAX_COMPUTE_UNITS);
    bytes = transaction.serialize().length;
    if (bytes > 1232) return result(false, "La transacción supera 1232 bytes. No se divide ni se cobra la comisión por separado.");
    stage = "simulation";
    const positionAddress = existing ? existing.position : derivePositionAddress(nft.publicKey);
    const sizing = await connection.simulateTransaction(transaction, { sigVerify: false, replaceRecentBlockhash: true });
    // Tight compute limit keeps congestion pricing proportional to real usage.
    if (!sizing.value.err) transaction = compile(computeLimit(sizing.value.unitsConsumed));
    const simulated = await connection.simulateTransaction(transaction, { sigVerify: false, replaceRecentBlockhash: true, accounts: { encoding: "base64", addresses: [source.toBase58(), positionAddress.toBase58(), feeAta.toBase58()] } });
    if (simulated.value.err) return { ...result(false, "La simulación de Solana rechazó la transacción compuesta. No se firmó ni envió; no se cobró comisión."), slot: simulated.context.slot, units: simulated.value.unitsConsumed };
    const [sourceAccount, positionAccount, feeAccount] = simulated.value.accounts ?? [];
    let feeVerified = false, positionVerified = false;
    let feeReceived = amounts.fee === 0n;
    if (amounts.fee > 0n && feeAccount?.owner === TOKEN_PROGRAM_ID.toBase58() && feeAccount.data[0]) {
      const decoded = AccountLayout.decode(Buffer.from(feeAccount.data[0], "base64"));
      feeReceived = decoded.mint.equals(usdc) && decoded.owner.equals(feeOwner) && decoded.amount - (feeBefore ?? 0n) === amounts.fee;
    }
    if (sourceAccount?.owner === TOKEN_PROGRAM_ID.toBase58() && sourceAccount.data[0]) {
      const decoded = AccountLayout.decode(Buffer.from(sourceAccount.data[0], "base64"));
      feeVerified = feeReceived && decoded.mint.equals(usdc) && decoded.owner.equals(owner) && decoded.amount >= balance.amount - amounts.gross && decoded.amount <= balance.amount;
    }
    if (positionAccount?.data[0]) {
      const state = cpAmmCoder.accounts.decode("Position", Buffer.from(positionAccount.data[0], "base64"));
      // The raw IDL coder keeps on-chain snake_case field names.
      positionVerified = state.pool.equals(poolAddress) && state.nft_mint.equals(existing ? existing.nftMint : nft.publicKey) && state.unlocked_liquidity.gt(new BN(0));
    }
    const verified = feeVerified && positionVerified;
    // Pilot only: return the exact simulated message, partially signed by the
    // ephemeral position NFT key. The wallet owner still has to sign it.
    const prepared = verified && options.preparePilot ? (() => { if (!existing) transaction.sign([nft]); return { transaction: Buffer.from(transaction.serialize()).toString("base64"), lastValidBlockHeight: block.lastValidBlockHeight, position: positionAddress.toBase58() }; })() : undefined;
    return { ...(prepared ? { prepared } : {}), ...result(feeVerified && positionVerified, feeVerified && positionVerified ? "Simulación satisfactoria: comisión de entrada verificada, gasto dentro del presupuesto y posición verificada. No se ha movido dinero ni se han verificado retiros." : "Solana no rechazó la simulación, pero no se pudieron verificar el presupuesto y la posición; no se considera validada."), slot: simulated.context.slot, units: simulated.value.unitsConsumed, checks: { fee: feeVerified, position: positionVerified } };
  } catch (error) {
    // Server-only diagnostics; strip any credential before logging.
    console.error("[deposit-simulation]", stage, String(error instanceof Error ? error.message : error).replace(/api-key=[^&\s"]+/gi, "api-key=***").slice(0, 500));
    return result(false, stage === "jupiter" ? "Jupiter no pudo cotizar o preparar esta ruta. La simulación no se completó y no se ha movido dinero." : "No se pudo completar esta etapa de la simulación. No se firmó ni envió ninguna transacción.");
  }
}