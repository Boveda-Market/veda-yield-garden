/** Everything the wallet holds outside vaults, in dollars, so «Balance total» matches what the account really owns. */
export type HeldToken = { symbol: string; decimals: number; raw: bigint | undefined };

/**
 * reserve = network reserve (SOL) at market price; coins = every other held coin (stable dollars 1:1, the rest at market).
 * A coin whose price is unknown is left out instead of guessed.
 */
export function walletExtrasUsd(solLamports: bigint | undefined, tokens: readonly HeldToken[], prices: Readonly<Record<string, number>>) {
  const solPrice = prices["SOL"];
  const reserve = solLamports && solPrice ? (Number(solLamports) / 1e9) * solPrice : 0;
  const coins = tokens.reduce((sum, x) => {
    const p = prices[x.symbol];
    return x.raw && p ? sum + (Number(x.raw) / 10 ** x.decimals) * p : sum;
  }, 0);
  return { reserve, coins, total: reserve + coins };
}
