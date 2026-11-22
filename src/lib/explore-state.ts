/** Mi Billetera: a signed-in account with $0 in dollars and no vaults sees the explore-first layout. */
export function isExploringAccount(usdcMicro: bigint | undefined, vaultCount: number, vaultsLoading: boolean): boolean {
  return usdcMicro === 0n && vaultCount === 0 && !vaultsLoading;
}

/** Mi Portafolio: nothing to chart yet (no dollars, no network reserve, no vaults), so explore cards replace the empty $0 chart. */
export function isEmptyPortfolio(usdc: string, sol: string, positionCount: number): boolean {
  const u = Number(usdc), s = Number(sol);
  return positionCount === 0 && Number.isFinite(u) && Number.isFinite(s) && u === 0 && s === 0;
}
