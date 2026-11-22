export const FEE_WALLET = "93bF1K1dWMJseMuf15WLaNt1diVGACQ9gUFA7szsSbs7";
const SCALE = 1_000_000;

/** Progressive tiers by gross amount (micro-USDC): smaller amounts pay a higher %, larger amounts less. */
export type FeeKind = "deposit" | "exit" | "withdraw" | "harvest" | "move";
export const FEE_TIERS = [
  { name: "Básico", min: 0n, bps: { deposit: 0n, exit: 150n, withdraw: 200n, harvest: 300n, move: 300n } },
  { name: "Plus", min: 100_000_000n, bps: { deposit: 0n, exit: 100n, withdraw: 125n, harvest: 225n, move: 225n } },
  { name: "Pro", min: 500_000_000n, bps: { deposit: 0n, exit: 75n, withdraw: 75n, harvest: 150n, move: 150n } },
  { name: "VIP", min: 2_500_000_000n, bps: { deposit: 0n, exit: 40n, withdraw: 50n, harvest: 75n, move: 100n } },
] as const;
export function feeTier(units: bigint) { let t: (typeof FEE_TIERS)[number] = FEE_TIERS[0]; for (const x of FEE_TIERS) if (units >= x.min) t = x; return t; }
export function tierBps(units: bigint, kind: FeeKind) { return feeTier(units).bps[kind]; }
export function tierPercent(units: bigint, kind: FeeKind) { return Number(tierBps(units, kind)) / 100; }
/** Next tier threshold (micro-USDC) and its rate, or null at the top tier. */
export function nextTier(units: bigint, kind: FeeKind) { const i = FEE_TIERS.indexOf(feeTier(units)); const n = FEE_TIERS[i + 1]; return n ? { name: n.name, min: n.min, percent: Number(n.bps[kind]) / 100 } : null; }
export function tieredFee(units: bigint, kind: FeeKind) { return units > 0n ? (units * tierBps(units, kind)) / 10_000n : 0n; }

/** Vault exit / liquidation fee in micro-USDC (progressive tier), floored. (Name kept for callers.) */
export function progressiveFee(units: bigint) { return tieredFee(units, "exit"); }
/** Harvest fee in micro-USDC on claimed USDC, floored; the tier comes only from the harvested amount (position value is ignored). */
export function harvestFee(units: bigint, _positionUnits = 0n) { return tieredFee(units, "harvest"); }
/** Deposit fee in micro-USDC (progressive tier), floored. */
export function depositFee(units: bigint) { return tieredFee(units, "deposit"); }

/** Up/Down: entries are free; on claim, 2% of the total payout, floored. */
export const PREDICT_CLAIM_BPS = 200n;
export function predictClaimFee(payout: bigint, _cost?: bigint) { return payout > 0n ? (payout * PREDICT_CLAIM_BPS) / 10_000n : 0n; }

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

/** Any vault move (offer or voluntary): progressive "move" tier on the exit only, never shared with affiliates. */
export function rotateFee(units: bigint) { return tieredFee(units, "move"); }

/** Progressive Bóveda Market fee on bank/Cash App/Coinbase withdrawals, floored micro-USDC, deducted from the gross amount. */
export function withdrawFee(units: bigint) { return tieredFee(units, "withdraw"); }
