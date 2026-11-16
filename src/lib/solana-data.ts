import { z } from "zod";

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const solanaAddressSchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
export const realWalletInput = z.object({ wallet: solanaAddressSchema }).strict();

// Independent of the illustrative APYs used only in Prueba.
// `swapDecimals` marks a validated classic SPL token that Mi Billetera may swap against USDC; omit it until validated.
export const CHAIN_POOLS = [
  { id: "sol", kind: "damm", pool: "8Pm2kZpnxD3hoMmt4bjStX2Pw2Z9abpbHzZxMPqxPmie", mint: "So11111111111111111111111111111111111111112", symbol: "SOL", decimals: 9, swapDecimals: 9 },
  { id: "met", kind: "damm", pool: "BnztueWcXv93mgW7yJe8WYpnCxpz34nujPhfjQT6SLu1", mint: "METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL", symbol: "MET", decimals: 6, swapDecimals: 6 },
  // Concentrated-liquidity (DLMM) pool: classic SPL GTA6 (9 decimals) / USDC, no farm rewards.
  { id: "gta6", kind: "dlmm", pool: "99bL7ZdcQxcrkdJDKGoGpAhqZUMYEHzhMvtNadiZJpE8", mint: "4kjruqGHDsSqkMdFfCjV7Vb62HPFhtXyWc2t6JpQzDnz", symbol: "GTA6", decimals: 9, swapDecimals: 9 },
] as const;
export type ChainPoolConfig = (typeof CHAIN_POOLS)[number];
/** Vaults whose positions BÓVEDA can open, harvest and close. */
export const OPERABLE_VAULTS = ["sol", "met", "gta6"] as const;
export type OperableVault = (typeof OPERABLE_VAULTS)[number];
export const isOperableVault = (id: string): id is OperableVault => (OPERABLE_VAULTS as readonly string[]).includes(id);
export const isDlmmVault = (id: string) => CHAIN_POOLS.some((p) => p.id === id && p.kind === "dlmm");
export const vaultDecimals = (id: string) => CHAIN_POOLS.find((p) => p.id === id)?.decimals ?? 6;
export const vaultSymbol = (id: string) => CHAIN_POOLS.find((p) => p.id === id)?.symbol ?? "";

/** Format chain integer amounts without loss of precision or invented USD prices. */
export function tokenAmount(raw: string, decimals: number) {
  if (!/^\d+$/.test(raw) || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error("Importe no válido");
  const digits = raw.replace(/^0+(?=\d)/, "").padStart(decimals + 1, "0");
  if (decimals === 0) return digits;
  const whole = digits.slice(0, -decimals);
  const fraction = digits.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export type ChainPosition = {
  address: string;
  vaultId: string;
  symbol: string;
  tokenAmount: string | null;
  usdcAmount: string | null;
  feeTokenAmount: string | null;
  feeUsdcAmount: string | null;
  locked: boolean;
  /** Concentrated-liquidity only: the price left the position's range, so it is not earning fees. */
  outOfRange?: boolean;
  /** Range vaults only: the price sits above the range (position is all dollars). */
  priceAbove?: boolean;
  /** Range vaults only: the position's bin range and the pool's current price bin (integer bin ids). */
  bins?: { lower: number; upper: number; active: number };
};
export type RealWalletData = {
  wallet: string;
  usdc: string;
  sol: string;
  positions: ChainPosition[];
  positionsComplete: boolean;
  checkedAt: string;
};

export type RealWalletResult =
  | { success: true; data: RealWalletData }
  | { success: false; error: string };