export type Vault = {
  id: string;
  name: string;
  pair: string;
  pool: string;
  apy: number; // estimated annual %, illustrative
  risk: "Medio" | "Alto";
  blurb: string;
};

export const VAULTS: Vault[] = [
  { id: "sol", name: "Bóveda SOL", pair: "SOL/USDC", pool: "8Pm2kZpnxD3hoMmt4bjStX2Pw2Z9abpbHzZxMPqxPmie", apy: 18.4, risk: "Medio", blurb: "Pool SOL/USDC en Meteora DAMM v2. Operaciones de demostración." },
  { id: "met", name: "Bóveda MET", pair: "MET/USDC", pool: "BnztueWcXv93mgW7yJe8WYpnCxpz34nujPhfjQT6SLu1", apy: 34.2, risk: "Alto", blurb: "Pool MET/USDC en Meteora DAMM v2. Operaciones de demostración." },
  { id: "rwa", name: "Bóveda RWA · SpaceX", pair: "SPCX/USDC", pool: "7EuQvReu44hnngX2nTpYZzhVCTtxdfhTZf5hzjzEipKR", apy: 12.7, risk: "Medio", blurb: "Pool SPCX/USDC. Sin afiliación con SpaceX ni garantía de acciones o respaldo." },
];

export type Position = { id: string; vaultId: string; principal: number; openedAt: number; claimed: number };

/** Accrued fees in USDC since opening, minus what was already harvested. */
export function accrued(p: Position, apy: number, now: number) {
  const years = Math.max(0, now - p.openedAt) / (365 * 24 * 3600 * 1000);
  return Math.max(0, p.principal * (apy / 100) * years - p.claimed);
}
