import { Connection, PublicKey } from "@solana/web3.js";
import { CpAmm, getTokenProgram, getUnClaimLpFee, positionLiquidity } from "@meteora-ag/cp-amm-sdk";
import { getMint } from "@solana/spl-token";
import { CHAIN_POOLS, USDC_MINT, tokenAmount, type ChainPosition, type RealWalletData } from "@/lib/solana-data";

/** Every RPC failure is replaced before it can include the private query URL. */
export function heliusConnection(apiKey: string) {
  return new Connection(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(apiKey)}`, {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
    fetch: async (input, init) => {
      try {
        const response = await fetch(input, { ...init, signal: AbortSignal.timeout(20_000) });
        if (!response.ok) throw new Error("RPC indisponible");
        return response;
      } catch { throw new Error("La consulta de Solana no está disponible"); }
    },
  });
}

export async function readRealWallet(apiKey: string, address: string): Promise<RealWalletData> {
  const connection = heliusConnection(apiKey);
  const wallet = new PublicKey(address); // Reject invalid base58 / non-32-byte addresses.
  const cp = new CpAmm(connection);
  const [sol, usdcAccounts] = await Promise.all([
    connection.getBalance(wallet, "confirmed"),
    connection.getParsedTokenAccountsByOwner(wallet, { mint: new PublicKey(USDC_MINT) }, "confirmed"),
  ]);
  let usdc = 0n;
  for (const row of usdcAccounts.value) {
    const info = row.account.data.parsed.info;
    if (info.mint !== USDC_MINT || info.owner !== address || info.tokenAmount.decimals !== 6) throw new Error("Cuenta USDC no válida");
    usdc += BigInt(info.tokenAmount.amount);
  }
  let positionsComplete = true;
  const positions: ChainPosition[] = [];
  try {
    // The SDK discovers position NFTs actually owned by this address, not local records.
    const owned = await cp.getPositionsByUser(wallet);
    const states = new Map<string, Awaited<ReturnType<typeof cp.fetchPoolState>>>();
    for (const p of owned) {
      const config = CHAIN_POOLS.find((pool) => pool.pool === p.positionState.pool.toBase58());
      if (!config) continue;
      const previous = states.get(config.pool);
      const pool = previous ?? await cp.fetchPoolState(new PublicKey(config.pool));
      states.set(config.pool, pool);
      if (pool.tokenAMint.toBase58() !== config.mint || pool.tokenBMint.toBase58() !== USDC_MINT) throw new Error("Tokens del pool no válidos");
      const mint = await getMint(connection, pool.tokenAMint, "confirmed", getTokenProgram(pool.tokenAFlag));
      const locked = !p.positionState.vestedLiquidity.isZero() || !p.positionState.permanentLockedLiquidity.isZero();
      let token: string | null = null;
      let usdcValue: string | null = null;
      let feeToken: string | null = null;
      let feeUsdc: string | null = null;
      // Token-2022 extension-adjusted amounts require independent validation.
      // Never display an unadjusted Token-2022 value as spendable proceeds.
      if (pool.tokenAFlag === 0 && pool.tokenBFlag === 0) {
        const quote = cp.getWithdrawQuote({
          liquidityDelta: positionLiquidity(p.positionState),
          sqrtPrice: pool.sqrtPrice, minSqrtPrice: pool.sqrtMinPrice, maxSqrtPrice: pool.sqrtMaxPrice,
          collectFeeMode: pool.collectFeeMode, tokenAAmount: pool.tokenAAmount,
          tokenBAmount: pool.tokenBAmount, liquidity: pool.liquidity,
        });
        const fees = getUnClaimLpFee(pool, p.positionState);
        token = tokenAmount(quote.outAmountA.toString(), mint.decimals);
        usdcValue = tokenAmount(quote.outAmountB.toString(), 6);
        feeToken = tokenAmount(fees.feeTokenA.toString(), mint.decimals);
        feeUsdc = tokenAmount(fees.feeTokenB.toString(), 6);
      }
      positions.push({ address: p.position.toBase58(), vaultId: config.id, symbol: config.symbol,
        tokenAmount: token, usdcAmount: usdcValue, feeTokenAmount: feeToken, feeUsdcAmount: feeUsdc, locked });
    }
  } catch { positionsComplete = false; }
  return { wallet: address, sol: tokenAmount(String(sol), 9), usdc: tokenAmount(usdc.toString(), 6), positions, positionsComplete, checkedAt: new Date().toISOString() };
}