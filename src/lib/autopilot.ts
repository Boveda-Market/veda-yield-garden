import { tgCard } from "@/lib/telegram-format";

/** Key quorum registered with Privy for Autopilot; its private key lives only in the server secret PRIVY_AUTOPILOT_KEY_SEED. */
export const AUTOPILOT_SIGNER_ID = "u68gefvvseqxvwfchw7h5qc0";
/** Privy policy attached to the Autopilot signer: it may only sign transactions whose instructions call these programs. */
export const AUTOPILOT_POLICY_ID = "gfpstuzwnejzt79dcidefqp5";
/** Top-level programs a range-vault rebalance uses; anything else is refused by us and by the Privy policy. */
export const AUTOPILOT_PROGRAMS = [
  "ComputeBudget111111111111111111111111111111",
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
] as const;

/** Autopilot waits this long out of range before re-centring (the manual 10-min alert stays the fallback). */
export const AUTOPILOT_WAIT_MS = 5 * 60_000;
/** At most one automatic rebalance per wallet in this window, so a choppy market cannot grind the balance down. */
export const AUTOPILOT_COOLDOWN_MS = 12 * 3600_000;
/** A failed attempt (price impact, low reserve, network) is retried after this pause. */
export const AUTOPILOT_RETRY_MS = 30 * 60_000;
/** Stricter in-pool swap impact than the manual rebalance; above it Autopilot waits and the user is alerted instead. */
export const AUTOPILOT_MAX_IMPACT_PCT = 1.5;
/** Rebalances one cron pass may run, bounding work and RPC use. */
export const AUTOPILOT_MAX_PER_RUN = 3;

export type AutopilotRow = { enabled: boolean; last_attempt_at: string | null; last_rebalance_at: string | null };

const ms = (v: string | null | undefined) => { const t = v ? Date.parse(v) : NaN; return Number.isFinite(t) ? t : null; };

/** Why Autopilot should (or should not) re-centre a position on this pass. */
export function autopilotDecision(row: AutopilotRow, outSince: string | null | undefined, now: number): "due" | "off" | "waiting" | "cooldown" | "retry" {
  if (!row.enabled) return "off";
  const out = ms(outSince);
  if (out === null || now - out < AUTOPILOT_WAIT_MS) return "waiting";
  const last = ms(row.last_rebalance_at);
  if (last !== null && now - last < AUTOPILOT_COOLDOWN_MS) return "cooldown";
  const tried = ms(row.last_attempt_at);
  if (tried !== null && now - tried < AUTOPILOT_RETRY_MS) return "retry";
  return "due";
}

/** True only when every top-level program in the transaction is on the allowlist. */
export function onlyAllowedPrograms(programIds: readonly string[], allowed: readonly string[]) {
  return programIds.length > 0 && programIds.every((p) => allowed.includes(p));
}

/** Personal Telegram card after Autopilot re-centred a position. */
export function autopilotDoneText(vaultName: string, valueUsd: string | undefined) {
  return tgCard("🤖", `Piloto automático rebalanceó tu ${vaultName}`, [
    `🎯 El precio salió de tu rango y la volvimos a centrar${valueUsd ? ` (≈ $${valueUsd})` : ""}.`,
    "💰 Tus ganancias pendientes se sumaron a la posición. Sin comisión de BÓVEDA.",
    "✅ Ya vuelve a generar. Puedes apagar el piloto cuando quieras en Mi Billetera.",
  ]);
}
