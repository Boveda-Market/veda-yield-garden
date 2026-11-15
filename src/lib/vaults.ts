export type Vault = {
  id: string;
  name: string;
  pair: string;
  pool: string;
  apy: number; // estimated annual %, illustrative
  risk: "Medio" | "Alto" | "Muy alto";
  blurb: string;
};

export const VAULTS: Vault[] = [
  { id: "sol", name: "Bóveda SOL", pair: "SOL/USDC", pool: "8Pm2kZpnxD3hoMmt4bjStX2Pw2Z9abpbHzZxMPqxPmie", apy: 18.4, risk: "Medio", blurb: "Gana comisiones por intercambios entre SOL y USDC. Rendimiento constante con riesgo medio." },
  { id: "gta6", name: "Bóveda GTA6", pair: "GTA6/USDC", pool: "99bL7ZdcQxcrkdJDKGoGpAhqZUMYEHzhMvtNadiZJpE8", apy: 0, risk: "Muy alto", blurb: "Comisiones altas por la compraventa de GTA6, una moneda nueva y muy volátil sin relación confirmada con Rockstar Games. Tu dinero trabaja en un rango de precio: si el precio sale de ese rango deja de generar hasta que vuelva o cierres. Al abrir se aparta una garantía que vuelve al cerrar." },
  { id: "met", name: "Bóveda MET", pair: "MET/USDC", pool: "BnztueWcXv93mgW7yJe8WYpnCxpz34nujPhfjQT6SLu1", apy: 34.2, risk: "Alto", blurb: "Mayor rendimiento por comisiones con exposición a MET. Mayor volatilidad y riesgo alto." },
];

export type Position = { id: string; vaultId: string; principal: number; openedAt: number; claimed: number };

/** Accrued fees in USDC since opening, minus what was already harvested. */
export function accrued(p: Position, apy: number, now: number) {
  const years = Math.max(0, now - p.openedAt) / (365 * 24 * 3600 * 1000);
  return Math.max(0, p.principal * (apy / 100) * years - p.claimed);
}
