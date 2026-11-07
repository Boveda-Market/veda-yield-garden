import { z } from "zod";

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const solanaAddressSchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
export const realWalletInput = z.object({ wallet: solanaAddressSchema }).strict();

// Independent of the illustrative APYs used only in Prueba.
export const CHAIN_POOLS = [
  { id: "sol", pool: "8Pm2kZpnxD3hoMmt4bjStX2Pw2Z9abpbHzZxMPqxPmie", mint: "So11111111111111111111111111111111111111112", symbol: "SOL" },
  { id: "met", pool: "BnztueWcXv93mgW7yJe8WYpnCxpz34nujPhfjQT6SLu1", mint: "METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL", symbol: "MET" },
  { id: "rwa", pool: "7EuQvReu44hnngX2nTpYZzhVCTtxdfhTZf5hzjzEipKR", mint: "SPCXxcqXj6e5dJDVNovHN8744zkbhM2bYudU45BimGb", symbol: "SPCX" },
] as const;

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