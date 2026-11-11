export const FEE_PERCENT = 1;
export const DEPOSIT_FEE_PERCENT = 1;
export const FEE_WALLET = "93bF1K1dWMJseMuf15WLaNt1diVGACQ9gUFA7szsSbs7";
const SCALE = 1_000_000;

/** Flat BÓVEDA rate on every fee-bearing operation (1%), no free allowance. */
export const FEE_BPS = 100n;
const flat = (units: bigint) => (units > 0n ? (units * FEE_BPS) / 10_000n : 0n);

/** Harvest / liquidation fee in micro-USDC: flat 1% from the first unit, floored. (Name kept for callers.) */
export function progressiveFee(units: bigint) { return flat(units); }

/** Deposit fee in micro-USDC: flat 1%, floored. */
export function depositFee(units: bigint) { return flat(units); }

/** Up/Down: entries are free; on claim, 1% of the profit only (payout − cost), floored; 0 when no profit. */
export function predictClaimFee(payout: bigint, cost: bigint) { return payout > cost ? flat(payout - cost) : 0n; }

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
