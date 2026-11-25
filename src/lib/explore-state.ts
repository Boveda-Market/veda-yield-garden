/** Mi Billetera: a signed-in account with $0 in dollars and no vaults sees the explore-first layout. */
export function isExploringAccount(usdcMicro: bigint | undefined, vaultCount: number, vaultsLoading: boolean): boolean {
  return usdcMicro === 0n && vaultCount === 0 && !vaultsLoading;
}

/** Mi Portafolio: nothing to chart yet (no dollars, no network reserve, no vaults), so explore cards replace the empty $0 chart. */
export function isEmptyPortfolio(usdc: string, sol: string, positionCount: number): boolean {
  const u = Number(usdc), s = Number(sol);
  return positionCount === 0 && Number.isFinite(u) && Number.isFinite(s) && u === 0 && s === 0;
}

/** Network reserve above this (0.01 SOL, in lamports) means the person brought their own coins. */
export const OWN_SOL_LAMPORTS = 10_000_000n;

/** Wallet funded from outside (own SOL above the reserve, or other coins): skip the new-user guides. */
export function hasOwnFunds(solLamports: bigint | undefined, otherTokens: Record<string, bigint | undefined> = {}): boolean {
  if (solLamports != null && solLamports > OWN_SOL_LAMPORTS) return true;
  return Object.entries(otherTokens).some(([k, v]) => k !== "USDC" && k !== "SOL" && v != null && v > 0n);
}
