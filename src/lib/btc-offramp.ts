/** USDC → native Bitcoin (Cash App) withdrawal rules shared by UI, server and tests. */
import { withdrawFee } from "@/lib/fees";
export const BTC_OFFRAMP_MIN_USDC = 25;
export const BTC_OFFRAMP_MAX_USDC = 5000;
export const BOVEDA_BTC_FEE_PCT = 1;

const BECH32 = /^bc1[ac-hj-np-z02-9]{11,71}$/;
const BASE58 = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;

/** Accepts mainnet Bitcoin addresses (bc1…, 1…, 3…). Lightning invoices are rejected. */
export function isBtcAddress(raw: string): boolean {
  const a = raw.trim();
  if (a.startsWith("bc1") || a.startsWith("BC1")) return BECH32.test(a.toLowerCase()) && (a === a.toLowerCase() || a === a.toUpperCase());
  return BASE58.test(a);
}

export function amountAllowed(usdc: number): boolean {
  return Number.isFinite(usdc) && usdc >= BTC_OFFRAMP_MIN_USDC && usdc <= BTC_OFFRAMP_MAX_USDC;
}

/** Net amount sent to the provider after Bóveda's fee: the gross minimum minus its fee is still allowed. */
export const BTC_OFFRAMP_MIN_NET_USDC = Number(BigInt(BTC_OFFRAMP_MIN_USDC * 1e6) - withdrawFee(BigInt(BTC_OFFRAMP_MIN_USDC * 1e6))) / 1e6;
export function netAmountAllowed(usdc: number): boolean {
  return Number.isFinite(usdc) && usdc >= BTC_OFFRAMP_MIN_NET_USDC && usdc <= BTC_OFFRAMP_MAX_USDC;
}

/** Provider cost in USDC: what is sent minus the USD value of the BTC that arrives. */
export function providerCost(depositUsdc: number, settleBtc: number, usdcPerBtc: number) {
  const value = settleBtc * usdcPerBtc;
  const cost = Math.max(0, depositUsdc - value);
  return { value, cost, pct: depositUsdc > 0 ? (cost / depositUsdc) * 100 : 0 };
}
