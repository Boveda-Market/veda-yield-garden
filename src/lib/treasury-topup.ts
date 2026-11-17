/** Treasury self-refill rules: the treasury swaps some of its own free dollars into network reserve before it runs dry. */
export const TOPUP_TRIGGER_LAMPORTS = 150_000_000n; // below 0.15 SOL, refill (each new account takes ~0.065)
export const TOPUP_MIN_SOL_LAMPORTS = 2_500_000n; // needs ~0.0025 SOL to pay its own swap (temporary account + fee)
export const TOPUP_COOLDOWN_MS = 15 * 60_000;
/** Kept untouched on top of pending affiliate commissions. */
export const TOPUP_CUSHION_MICRO = 10_000_000n; // $10
/** Free-dollar thresholds → amount swapped, biggest first. */
export const TOPUP_TIERS: readonly { minFree: bigint; amount: bigint }[] = [
  { minFree: 50_000_000n, amount: 30_000_000n },
  { minFree: 25_000_000n, amount: 15_000_000n },
  { minFree: 15_000_000n, amount: 10_000_000n },
];

export type TopupDecision = { kind: "swap"; amountMicro: bigint } | { kind: "skip"; reason: "healthy" | "cooldown" | "no-sol" | "no-dollars" };

/** Free dollars = treasury USDC − pending affiliate commissions − cushion (affiliate money is never spent on the refill). */
export function freeDollarsMicro(usdcMicro: bigint, pendingMicro: bigint) { return usdcMicro - pendingMicro - TOPUP_CUSHION_MICRO; }

export function decideTopup(input: { sol: bigint; usdcMicro: bigint; pendingMicro: bigint; lastAt: number | null; now: number; manual?: boolean }): TopupDecision {
  if (!input.manual && input.sol >= TOPUP_TRIGGER_LAMPORTS) return { kind: "skip", reason: "healthy" };
  if (!input.manual && input.lastAt !== null && input.now - input.lastAt < TOPUP_COOLDOWN_MS) return { kind: "skip", reason: "cooldown" };
  if (input.sol < TOPUP_MIN_SOL_LAMPORTS) return { kind: "skip", reason: "no-sol" };
  const free = freeDollarsMicro(input.usdcMicro, input.pendingMicro);
  const tier = TOPUP_TIERS.find((x) => free >= x.minFree);
  return tier ? { kind: "swap", amountMicro: tier.amount } : { kind: "skip", reason: "no-dollars" };
}

const usd = (m: bigint) => (Number(m) / 1e6).toFixed(2), sol = (l: bigint) => (Number(l) / 1e9).toFixed(4);
/** Detailed operator alert after a successful refill: amounts, rate, reserve before/after, protected vs free dollars, signature. */
export function topupAlertHtml(r: { amountMicro: bigint; receivedLamports: bigint; solBefore: bigint; solAfter: bigint; usdcBefore: bigint; pendingMicro: bigint; signature: string }) {
  const usdcAfter = r.usdcBefore - r.amountMicro;
  const rate = r.receivedLamports > 0n ? (Number(r.amountMicro) / 1e6) / (Number(r.receivedLamports) / 1e9) : 0;
  const free = freeDollarsMicro(usdcAfter, r.pendingMicro);
  const status = r.solAfter >= TOPUP_TRIGGER_LAMPORTS ? "🟢 Óptimo" : "🟡 Aún bajo";
  return [
    "🔄 <b>Auto-recarga de Tesorería Completada</b>", "",
    "📊 <b>Desglose de la Operación:</b>",
    `• <b>USDC Convertido:</b> $${usd(r.amountMicro)} USDC`,
    `• <b>SOL Recibido:</b> +${sol(r.receivedLamports)} SOL`,
    `• <b>Tasa aproximada:</b> ~$${rate.toFixed(2)} / SOL`, "",
    "⛽ <b>Estado de la Reserva (SOL):</b>",
    `• <b>Antes:</b> ${sol(r.solBefore)} SOL (límite ${sol(TOPUP_TRIGGER_LAMPORTS)})`,
    `• <b>Ahora:</b> ${sol(r.solAfter)} SOL (${status})`, "",
    "💵 <b>Balance USDC en Tesorería:</b>",
    `• <b>Saldo total:</b> $${usd(usdcAfter)} USDC`,
    `• <b>Comisiones de afiliados protegidas:</b> $${usd(r.pendingMicro)} USDC`,
    `• <b>Colchón de seguridad blindado:</b> $${usd(TOPUP_CUSHION_MICRO)} USDC`,
    `• <b>Dólares libres restantes:</b> $${usd(free > 0n ? free : 0n)} USDC`, "",
    "🔗 <b>Tx:</b>", `<code>${r.signature}</code>`,
  ].join("\n");
}
