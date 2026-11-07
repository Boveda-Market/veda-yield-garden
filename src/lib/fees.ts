export const FEE_PERCENT = 1;
export const DEPOSIT_FEE_PERCENT = 0;
export const FEE_WALLET = "93bF1K1dWMJseMuf15WLaNt1diVGACQ9gUFA7szsSbs7";
const SCALE = 1_000_000;

/** Amounts and fees truncate to USDC's six decimal places, never rounding fees up. */
export function transactionAmounts(amount: number, kind: "deposit" | "exit" = "exit") {
  if (!Number.isFinite(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER / SCALE) throw new Error("Importe inválido");
  const units = Math.floor(Number((amount * SCALE).toFixed(4)));
  const feeUnits = Math.floor(units * (kind === "deposit" ? DEPOSIT_FEE_PERCENT : FEE_PERCENT) / 100);
  return { gross: units / SCALE, fee: feeUnits / SCALE, net: (units - feeUnits) / SCALE };
}

export function validDeposit(amount: string, available: number) {
  return /^\d+(\.\d{1,6})?$/.test(amount) && Number(amount) > 0 && Number(amount) <= available && Number.isFinite(Number(amount));
}