/** Local-only devnet harness. Never imported by a route or server function.
 * bun scripts/validate-devnet.ts
 * TEST_WALLET_FILE=/tmp/boveda-devnet/wallet.json is optional; never commit it.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import BN from "bn.js";
import { Connection, Keypair, PublicKey, Transaction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { CpAmm, CP_AMM_PROGRAM_ID, CollectFeeMode, SwapMode, derivePoolAddress, derivePositionAddress, getCurrentPoint } from "@meteora-ag/cp-amm-sdk";
import { composeDevnetDeposit, DEVNET_RPC, requireDevnet, testDepositAmounts } from "../src/lib/devnet-composition";

const path = process.env["TEST_WALLET_FILE"] ?? "/tmp/boveda-devnet/wallet.json";
const connection = new Connection(DEVNET_RPC, { commitment: "confirmed", disableRetryOnRateLimit: true });

async function main() {
  const genesis = await connection.getGenesisHash();
  requireDevnet(genesis);
  let wallet: Keypair;
  try { wallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(path, "utf8")))); }
  catch {
    wallet = Keypair.generate();
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(Array.from(wallet.secretKey)), { mode: 0o600 });
  }
  const program = await connection.getAccountInfo(CP_AMM_PROGRAM_ID);
  if (!program?.executable) throw new Error("Programa Meteora no disponible en devnet");
  console.log("Devnet only. Test wallet:", wallet.publicKey.toBase58());
  let balance = await connection.getBalance(wallet.publicKey);
  if (balance < 500_000_000) {
    try {
      const signature = await connection.requestAirdrop(wallet.publicKey, 1_000_000_000);
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        balance = await connection.getBalance(wallet.publicKey);
        if (balance >= 500_000_000) break;
      }
      console.log("Airdrop requested:", signature);
    } catch { /* Public faucet may be rate limited; never fall back to mainnet. */ }
  }
  if (balance < 500_000_000) {
    console.log("BLOCKED: Fund this address with at least 0.5 devnet SOL only. No tokens, pools or composed transactions were created.");
    process.exitCode = 2;
    return;
  }

  const cp = new CpAmm(connection);
  const config = (await cp.getStaticConfigs()).find((row) => row.account.collectFeeMode === CollectFeeMode.BothToken && !row.account.sqrtMinPrice.isZero());
  if (!config) throw new Error("No hay configuración concentrada de prueba compatible");
  const testUsdc = await createMint(connection, wallet, wallet.publicKey, null, 6);
  const testToken = await createMint(connection, wallet, wallet.publicKey, null, 6);
  const usdcAta = await getOrCreateAssociatedTokenAccount(connection, wallet, testUsdc, wallet.publicKey);
  const tokenAta = await getOrCreateAssociatedTokenAccount(connection, wallet, testToken, wallet.publicKey);
  await mintTo(connection, wallet, testUsdc, usdcAta.address, wallet, 10_000_000_000_000n);
  await mintTo(connection, wallet, testToken, tokenAta.address, wallet, 10_000_000_000_000n);

  async function send(tx: Transaction, extra: Keypair[]) {
    requireDevnet(await connection.getGenesisHash());
    const block = await connection.getLatestBlockhash();
    const vtx = new VersionedTransaction(new TransactionMessage({ payerKey: wallet.publicKey, recentBlockhash: block.blockhash, instructions: tx.instructions }).compileToV0Message());
    vtx.sign([wallet, ...extra]);
    const simulation = await connection.simulateTransaction(vtx, { sigVerify: true });
    if (simulation.value.err) throw new Error(`Devnet setup simulation failed: ${JSON.stringify(simulation.value.err)}`);
    const signature = await connection.sendRawTransaction(vtx.serialize(), { skipPreflight: false });
    const confirmed = await connection.confirmTransaction({ signature, ...block }, "confirmed");
    if (confirmed.value.err) throw new Error("Devnet setup transaction failed");
    return signature;
  }

  // Two fresh isolated pools prevent the swap from changing the deposit quote's pool.
  async function poolWithConfig(configAddress: PublicKey) {
    const state = await cp.fetchConfigState(configAddress);
    const nft = Keypair.generate();
    const a = testToken;
    const b = testUsdc;
    const seed = new BN("1000000000000");
    const prepared = cp.preparePoolCreationParams({ tokenAAmount: seed, tokenBAmount: seed, minSqrtPrice: state.sqrtMinPrice, maxSqrtPrice: state.sqrtMaxPrice, collectFeeMode: state.collectFeeMode });
    const tx = await cp.createPool({ creator: wallet.publicKey, payer: wallet.publicKey, config: configAddress,
      positionNft: nft.publicKey, tokenAMint: a, tokenBMint: b, ...prepared,
      tokenAAmount: seed, tokenBAmount: seed, activationPoint: null, tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID });
    await send(tx, [nft]);
    return derivePoolAddress(configAddress, a, b);
  }
  const compatible = (await cp.getStaticConfigs()).filter((row) => row.account.collectFeeMode === CollectFeeMode.BothToken && !row.account.sqrtMinPrice.isZero());
  const second = compatible.find((row) => !row.publicKey.equals(config.publicKey));
  if (!second) throw new Error("Falta segunda configuración de prueba");
  const swapPool = await poolWithConfig(config.publicKey);
  const depositPool = await poolWithConfig(second.publicKey);
  const swapState = await cp.fetchPoolState(swapPool);
  const depositState = await cp.fetchPoolState(depositPool);
  if (!swapState.tokenBMint.equals(testUsdc) || !depositState.tokenBMint.equals(testUsdc)) throw new Error("Orden de mints inesperado");
  // Empty the pre-funded test-token balance so the deposit must consume swap output.
  const { burn } = await import("@solana/spl-token");
  const remaining = await getAccount(connection, tokenAta.address);
  await burn(connection, wallet, tokenAta.address, testToken, wallet, remaining.amount);
  const gross = 100_000_000n;
  const budget = testDepositAmounts(gross);
  const swapInput = budget.net / 2n;
  const quote = cp.getQuote2({ inputTokenMint: testUsdc, poolState: swapState, currentPoint: new BN(await getCurrentPoint(connection, swapState.activationType)),
    slippage: 0.5, tokenADecimal: 6, tokenBDecimal: 6, hasReferral: false, swapMode: SwapMode.ExactIn, amountIn: new BN(swapInput.toString()) });
  const minimum = quote.minimumAmountOut;
  if (!minimum || minimum.isZero()) throw new Error("Mínimo de swap inválido");
  const swap = await cp.swap2({ payer: wallet.publicKey, pool: swapPool, inputTokenMint: testUsdc, outputTokenMint: testToken,
    tokenAMint: swapState.tokenAMint, tokenBMint: swapState.tokenBMint, tokenAVault: swapState.tokenAVault, tokenBVault: swapState.tokenBVault,
    tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID, referralTokenAccount: null, poolState: swapState,
    swapMode: SwapMode.ExactIn, amountIn: new BN(swapInput.toString()), minimumAmountOut: minimum });
  const maxB = new BN((budget.net - swapInput).toString());
  const liquidity = cp.getLiquidityDelta({ maxAmountTokenA: minimum, maxAmountTokenB: maxB, sqrtPrice: depositState.sqrtPrice,
    sqrtMinPrice: depositState.sqrtMinPrice, sqrtMaxPrice: depositState.sqrtMaxPrice, collectFeeMode: depositState.collectFeeMode,
    tokenAAmount: depositState.tokenAAmount, tokenBAmount: depositState.tokenBAmount, liquidity: depositState.liquidity });
  const nft = Keypair.generate();
  const deposit = await cp.createPositionAndAddLiquidity({ owner: wallet.publicKey, pool: depositPool, positionNft: nft.publicKey,
    liquidityDelta: liquidity, maxAmountTokenA: minimum, maxAmountTokenB: maxB,
    tokenAAmountThreshold: minimum, tokenBAmountThreshold: maxB,
    tokenAMint: testToken, tokenBMint: testUsdc, tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID });
  const block = await connection.getLatestBlockhash();
  const built = composeDevnetDeposit({ genesis, owner: wallet.publicKey, testUsdcMint: testUsdc,
    blockhash: block.blockhash, gross, swap: swap.instructions, deposit: deposit.instructions });
  built.transaction.sign([wallet, nft]);
  const simulation = await connection.simulateTransaction(built.transaction, { sigVerify: true });
  if (simulation.value.err) throw new Error(`Composed devnet simulation failed: ${JSON.stringify(simulation.value.err)}`);
  requireDevnet(await connection.getGenesisHash());
  const signature = await connection.sendRawTransaction(built.transaction.serialize(), { skipPreflight: false });
  const confirmed = await connection.confirmTransaction({ signature, ...block }, "confirmed");
  if (confirmed.value.err) throw new Error("Composed transaction failed");
  const fee = await getAccount(connection, built.recipientAta);
  const position = await cp.fetchPositionState(derivePositionAddress(nft.publicKey));
  if (fee.amount !== budget.fee || !position.pool.equals(depositPool) || position.unlockedLiquidity.isZero()) throw new Error("La lectura final no demuestra depósito y fee");
  console.log(JSON.stringify({ network: "devnet", signature, testUsdcMint: testUsdc.toBase58(), swapPool: swapPool.toBase58(), depositPool: depositPool.toBase58(),
    feeRaw: fee.amount.toString(), position: derivePositionAddress(nft.publicKey).toBase58(), bytes: built.transaction.serialize().length, units: simulation.value.unitsConsumed,
    mainnetEnabled: false, rollbackValidated: false }, null, 2));
}
main().catch(() => { console.error("Devnet validation stopped; no mainnet fallback. Inspect the current stage before retrying."); process.exitCode = 1; });