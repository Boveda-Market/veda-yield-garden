export const FEE_PERCENT = 1;
export const DEPOSIT_FEE_PERCENT = 0.5;
export const FEE_WALLET = "5YhN1yeEKS9NgqQEezMyt8u7mDEdvsQbD9j1KZ35EHce";
const SCALE = 1_000_000;

/** First 10 USDC of every fee-bearing operation is free. */
export const FEE_FREE_MICRO = 10_000_000n;
/** Marginal rate applied only to the amount above the free allowance (1.25%). */
export const FEE_MARGINAL_BPS = 125n;

/** Progressive fee in micro-USDC: 0 up to 10 USDC, 1.25% on the excess, floored. */
export function progressiveFee(units: bigint) {
  if (units <= FEE_FREE_MICRO) return 0n;
  return ((units - FEE_FREE_MICRO) * FEE_MARGINAL_BPS) / 10_000n;
}

/** First 5 USDC of every deposit enters free. */
export const DEPOSIT_FEE_FREE_MICRO = 5_000_000n;
/** Deposit rate applied only to the amount above the free allowance (0.5%). */
export const DEPOSIT_FEE_BPS = 50n;

/** Progressive deposit fee in micro-USDC: 0 up to 5 USDC, 0.5% on the excess, floored. */
export function depositFee(units: bigint) {
  if (units <= DEPOSIT_FEE_FREE_MICRO) return 0n;
  return ((units - DEPOSIT_FEE_FREE_MICRO) * DEPOSIT_FEE_BPS) / 10_000n;
}

/** Amounts and fees truncate to USDC's six decimal places, never rounding fees up. */
export function transactionAmounts(amount: number, kind: "deposit" | "exit" = "exit") {
  if (!Number.isFinite(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER / SCALE) throw new Error("Importe inválido");
  const units = Math.floor(Number((amount * SCALE).toFixed(4)));
  const feeUnits = kind === "deposit" ? Number(depositFee(BigInt(units))) : Number(progressiveFee(BigInt(units)));
  return { gross: units / SCALE, fee: feeUnits / SCALE, net: (units - feeUnits) / SCALE };
}

export function validDeposit(amount: string, available: number) {
  return /^\d+(\.\d{1,6})?$/.test(amount) && Number(amount) > 0 && Number(amount) <= available && Number.isFinite(Number(amount));
}

/** Fixed 1% BÓVEDA fee on bank/Cash App withdrawals, floored micro-USDC, deducted from the gross amount. */
export const WITHDRAW_FEE_BPS = 100n;
export function withdrawFee(units: bigint) { return units > 0n ? (units * WITHDRAW_FEE_BPS) / 10_000n : 0n; }
