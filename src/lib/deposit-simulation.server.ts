import BN from "bn.js";
import { Buffer } from "buffer";
import { z } from "zod";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, SystemInstruction, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync, getAccount, TOKEN_PROGRAM_ID, AccountLayout, NATIVE_MINT } from "@solana/spl-token";
import { CpAmm, derivePositionAddress, cpAmmCoder } from "@meteora-ag/cp-amm-sdk";
import { heliusConnection } from "@/lib/solana-read.server";
import { CHAIN_POOLS, USDC_MINT, solanaAddressSchema } from "@/lib/solana-data";
import { FEE_WALLET } from "@/lib/fees";
import { simulationAmounts, simulationDisplay, type SimulationInput, type SimulationResult, type SimulationStage } from "@/lib/deposit-simulation";

const ixSchema = z.object({ programId: solanaAddressSchema, accounts: z.array(z.object({ pubkey: solanaAddressSchema, isSigner: z.boolean(), isWritable: z.boolean() })).max(128), data: z.string().max(20_000) });
const swapSchema = z.object({ setupInstructions: z.array(ixSchema), swapInstruction: ixSchema, cleanupInstruction: ixSchema.nullable().optional(), otherInstructions: z.array(ixSchema).optional(), addressLookupTableAddresses: z.array(solanaAddressSchema).max(16) });
const quoteSchema = z.object({ inputMint: z.string(), outputMint: z.string(), inAmount: z.string().regex(/^\d+$/), outAmount: z.string().regex(/^\d+$/), otherAmountThreshold: z.string().regex(/^\d+$/), swapMode: z.literal("ExactIn") }).passthrough();

async function jupiter(path: string, body?: unknown) {
  const response = await fetch(`https://api.jup.ag/swap/v1/${path}`, {
    method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error("Jupiter no está disponible para esta simulación");
  return response.json();
}

/** Read-only: no signatures, transaction bytes returned, broadcasting or funding overrides. */
export async function simulateDeposit(apiKey: string, input: SimulationInput): Promise<SimulationResult> {
  const amounts = simulationAmounts(input.amount);
  const display = simulationDisplay(input.amount);
  let stage: SimulationStage = "pool";
  let bytes: number | undefined;
  const result = (success: boolean, message: string): SimulationResult => ({ success, stage, message, ...display, sent: false, bytes });
  try {
    const connection = heliusConnection(apiKey);
    if (await connection.getGenesisHash() !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d") return result(false, "La conexión no corresponde a Solana Mainnet.");
    const config = CHAIN_POOLS.find((pool) => pool.id === input.vaultId);
    if (!config) return result(false, "Bóveda no válida.");
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
    const deposit = await cp.createPositionAndAddLiquidity({ owner, pool: poolAddress, positionNft: nft.publicKey, liquidityDelta: depositLiquidity, maxAmountTokenA: selected.minimum, maxAmountTokenB: selected.remaining, tokenAAmountThreshold: selected.minimum, tokenBAmountThreshold: selected.remaining, tokenAMint: pool.tokenAMint, tokenBMint: pool.tokenBMint, tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID });
    const feeOwner = new PublicKey(FEE_WALLET);
    const recipient = getAssociatedTokenAddressSync(usdc, feeOwner);
    const feeBefore = await getAccount(connection, recipient).catch(() => null);
    const swapIxs = [...swap.setupInstructions, ...(swap.otherInstructions ?? []), swap.swapInstruction].map(decodeIx);
    // Jupiter supplies wrapped SOL already. Do not wrap additional wallet SOL.
    const depositIxs = deposit.instructions.filter((ix) => {
      if (!pool.tokenAMint.equals(NATIVE_MINT) || !ix.programId.equals(SystemProgram.programId)) return true;
      if (SystemInstruction.decodeInstructionType(ix) !== "Transfer") return true;
      const transfer = SystemInstruction.decodeTransfer(ix);
      return !transfer.toPubkey.equals(getAssociatedTokenAddressSync(NATIVE_MINT, owner));
    });
    const instructions = [ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }), createAssociatedTokenAccountIdempotentInstruction(owner, recipient, feeOwner, usdc), createTransferCheckedInstruction(source, usdc, recipient, owner, amounts.fee, 6), ...swapIxs, ...depositIxs, ...(swap.cleanupInstruction ? [decodeIx(swap.cleanupInstruction)] : [])].filter((ix, index) => index === 0 || !ix.programId.equals(ComputeBudgetProgram.programId));
    const tables = await Promise.all(swap.addressLookupTableAddresses.map(async (address) => {
      const table = await connection.getAddressLookupTable(new PublicKey(address));
      if (!table.value) throw new Error("Tabla de direcciones no disponible");
      return table.value;
    }));
    const block = await connection.getLatestBlockhash();
    const transaction = new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: block.blockhash, instructions }).compileToV0Message(tables));
    bytes = transaction.serialize().length;
    if (bytes > 1232) return result(false, "La transacción supera 1232 bytes. No se divide ni se cobra la comisión por separado.");
    stage = "simulation";
    const positionAddress = derivePositionAddress(nft.publicKey);
    const simulated = await connection.simulateTransaction(transaction, { sigVerify: false, replaceRecentBlockhash: true, accounts: { encoding: "base64", addresses: [recipient.toBase58(), positionAddress.toBase58()] } });
    if (simulated.value.err) return { ...result(false, "La simulación de Solana rechazó la transacción compuesta. No se firmó ni envió; no se cobró comisión."), slot: simulated.context.slot, units: simulated.value.unitsConsumed };
    const [feeAccount, positionAccount] = simulated.value.accounts ?? [];
    let feeVerified = false, positionVerified = false;
    if (feeAccount?.owner === TOKEN_PROGRAM_ID.toBase58() && feeAccount.data[0]) {
      const decoded = AccountLayout.decode(Buffer.from(feeAccount.data[0], "base64"));
      feeVerified = decoded.mint.equals(usdc) && decoded.owner.equals(feeOwner) && decoded.amount === (feeBefore?.amount ?? 0n) + amounts.fee;
    }
    if (positionAccount?.data[0]) {
      const state = cpAmmCoder.accounts.decode("position", Buffer.from(positionAccount.data[0], "base64"));
      positionVerified = state.pool.equals(poolAddress) && state.nftMint.equals(nft.publicKey) && state.unlockedLiquidity.gt(new BN(0));
    }
    return { ...result(feeVerified && positionVerified, feeVerified && positionVerified ? "Simulación satisfactoria: la comisión y la posición aparecen juntas en el estado simulado. No se ha movido dinero. Esto no habilita depósitos reales ni verifica retiros." : "Solana no rechazó la simulación, pero no se pudieron verificar ambos resultados; no se considera validada."), slot: simulated.context.slot, units: simulated.value.unitsConsumed, checks: { fee: feeVerified, position: positionVerified } };
  } catch {
    return result(false, stage === "jupiter" ? "Jupiter no pudo cotizar o preparar esta ruta. La simulación no se completó y no se ha movido dinero." : "No se pudo completar esta etapa de la simulación. No se firmó ni envió ninguna transacción.");
  }
}