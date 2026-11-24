import { tgCard, tgRow } from "@/lib/telegram-format";

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
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
] as const;
/** Treasury USDC account: the only destination a top-level token transfer in an Autopilot rebalance may use (the fee). */
export const AUTOPILOT_FEE_ATA = "DXbXVtrEEyJ7zuanJNzyyj1D3PQBsUm65hdQ3DHiarQW";

/** On-chain memo tagging Autopilot transactions so wallet activity labels them Auto-Compound. */
export const AUTOPILOT_MEMO = "boveda:autopilot";

/** Autopilot waits this long out of range before re-centring (the manual 10-min alert stays the fallback). */
export const AUTOPILOT_WAIT_MS = 5 * 60_000;
/** A failed attempt (price impact, low reserve, network) is retried after this pause. */
export const AUTOPILOT_RETRY_MS = 5 * 60_000;
/** Stricter in-pool swap impact than the manual rebalance; above it Autopilot waits and the user is alerted instead. */
export const AUTOPILOT_MAX_IMPACT_PCT = 1.5;
/** Rebalances one cron pass may run, bounding work and RPC use. */
export const AUTOPILOT_MAX_PER_RUN = 3;

export type AutopilotRow = { enabled: boolean; last_attempt_at: string | null; last_rebalance_at: string | null };

const ms = (v: string | null | undefined) => { const t = v ? Date.parse(v) : NaN; return Number.isFinite(t) ? t : null; };

/** Why Autopilot should (or should not) re-centre a position on this pass. */
export function autopilotDecision(row: AutopilotRow, outSince: string | null | undefined, now: number): "due" | "off" | "waiting" | "retry" {
  if (!row.enabled) return "off";
  const out = ms(outSince);
  if (out === null || now - out < AUTOPILOT_WAIT_MS) return "waiting";
  const tried = ms(row.last_attempt_at);
  if (tried !== null && now - tried < AUTOPILOT_RETRY_MS) return "retry";
  return "due";
}

/** True only when every top-level program in the transaction is on the allowlist. */
export function onlyAllowedPrograms(programIds: readonly string[], allowed: readonly string[]) {
  return programIds.length > 0 && programIds.every((p) => allowed.includes(p));
}

/** Personal Telegram card after Autopilot re-centred a position. */
/** Below this, harvested earnings are "centavos": the notice explains the reset without quoting a tiny amount. */
export const AUTOPILOT_SMALL_GAINS_USD = 0.5;

/** True when the earnings folded into the vault are worth quoting as an exact amount. */
export const gainsWorthQuoting = (gainsUsd: number | null | undefined): gainsUsd is number => typeof gainsUsd === "number" && Number.isFinite(gainsUsd) && gainsUsd >= AUTOPILOT_SMALL_GAINS_USD;

/**
 * Personal Telegram card after an automatic rebalance. The rebalance also folds the pending earnings into the vault,
 * so the card says how much was added (or, for cents, that the counter restarts) and nobody thinks earnings vanished.
 */
export function autopilotDoneText(vaultName: string, valueUsd: string | undefined, gainsUsd?: number | null, destination: "wallet" | "vault" = "vault") {
  const value = valueUsd && Number.isFinite(Number(valueUsd)) && Number(valueUsd) > 0 ? `$${Number(valueUsd).toFixed(2)}` : null;
  return tgCard("🤖", `Piloto automático rebalanceó ${vaultName}`, [
    tgRow("🏦", "Bóveda", vaultName),
    gainsWorthQuoting(gainsUsd) ? tgRow("💵", destination === "wallet" ? "Intereses disponibles" : "Intereses reinvertidos", `+$${gainsUsd.toFixed(2)}`) : destination === "wallet" ? "💵 Intereses convertidos a dólares digitales disponibles" : "💵 Intereses acumulados reinvertidos",
    value ? tgRow("📊", "Posición activa", value) : null,
    tgRow("🎯", "Estado", "Centrada en el precio actual"),
    "",
    destination === "wallet" ? "✅ Tus intereses quedan en dólares digitales disponibles en tu billetera; no se reinvirtieron." : "✅ Tu contador de ganancias empieza desde cero porque esos dólares ya están rindiendo.",
    "✨ <b>No tienes que hacer ninguna acción.</b>",
  ]);
}

/** Vault id tagged on autopilot_enrollments.last_result as " ·v=<id>" so bell and reconcile name the right vault. */
export const vaultTag = (id: string) => ` ·v=${id}`;
export const vaultFromResult = (r: string | null | undefined) => /·v=([a-z0-9]+)/.exec(r ?? "")?.[1] ?? null;
/** Persist destination beside the existing result, so delayed confirmations keep the same receipt. */
export const gainsDestinationFromResult = (r: string | null | undefined): "wallet" | "vault" => /·g=wallet\b/.test(r ?? "") ? "wallet" : "vault";

/** Range vaults (GTA6) run on Autopilot by default: turn it on only for wallets that never had a choice recorded; a wallet that switched it off stays off. */
export function shouldAutoEnableAutopilot(opts: { hasRangePosition: boolean; enabled: boolean | null }) {
  return opts.hasRangePosition && opts.enabled === false;
}

/** Informational bell/Telegram notice: the newest Autopilot event worth telling (rebalance first, then activation) within 7 days. */
export function autopilotNotice(s: { enabled: boolean; enabledAt: string | null; lastRebalanceAt: string | null; lastGainsUsd?: number | null; lastVaultId?: string | null; lastGainsDestination?: "wallet" | "vault" } | null, now: number): { id: string; kind: "rebalanced" | "on"; at: string; gainsUsd: number | null; vaultId: string | null; gainsDestination: "wallet" | "vault" } | null {
  if (!s) return null;
  const fresh = (iso: string | null) => !!iso && now - Date.parse(iso) < 7 * 86_400_000;
  if (fresh(s.lastRebalanceAt) && s.lastRebalanceAt) return { id: `autopilot:rb:${s.lastRebalanceAt}`, kind: "rebalanced", at: s.lastRebalanceAt, gainsUsd: gainsWorthQuoting(s.lastGainsUsd) ? s.lastGainsUsd : null, vaultId: s.lastVaultId ?? null, gainsDestination: s.lastGainsDestination ?? "vault" };
  return null;
}

/** Consecutive failed Auto-Compound attempts are kept as a "[n] " prefix on last_result (reset by a confirmed rebalance). */
export const AUTOPILOT_MANUAL_AFTER_FAILS = 3;
export function autopilotFailures(lastResult: string | null | undefined): number { const m = /^\[(\d+)\] /.exec(lastResult ?? ""); return m ? Number(m[1]) : 0; }
export function withFailure(prev: string | null | undefined, message: string): string { return `[${autopilotFailures(prev) + 1}] ${message}`.slice(0, 300); }
/** The manual «Sumar ganancias a la bóveda» button only appears after Auto-Compound failed this many times in a row. */
export const showManualCompound = (failures: number | null | undefined) => (failures ?? 0) >= AUTOPILOT_MANUAL_AFTER_FAILS;

/** Dollars a rebalance adds to the position: claimed fees plus absorbed wallet vault tokens, minus the treasury fee (USD, 6-decimal raw units). */
export function rebalanceGainsUsd(feeX: bigint, feeY: bigint, absorbedX: bigint, price: number, bovedaFee: bigint): number {
  return Math.max(0, (Number(feeX + absorbedX) * price + Number(feeY) - Number(bovedaFee)) / 1e6);
}

/** Privy refusal that means the plan's limits were reached (429 rate limit, 402/403 quota/plan): the operator must act in Privy. */
export function privyLimitError(message: string): "rate" | "plan" | null {
  if (/Privy 429/.test(message)) return "rate";
  if (/Privy 40[23]/.test(message)) return "plan";
  return null;
}
/** One operator alert per this window while Privy keeps refusing. */
export const PRIVY_LIMIT_ALERT_MS = 60 * 60_000;

/** Leftover tokens worth converting before a rebalance: at least $1 (micro-USDC), below that network costs eat the value. */
export const AUTOPILOT_SWEEP_MIN_MICRO = 1_000_000n;
/** Jupiter aggregator program, allowed only for the pre-rebalance leftover → USDC swap. */
export const AUTOPILOT_SWEEP_PROGRAMS = ["ComputeBudget111111111111111111111111111111", "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"] as const;
/** Never swept: USDC (cash), wrapped SOL (network reserve), JupUSD (Doble o Nada play money). */
export const AUTOPILOT_SWEEP_EXCLUDED = ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "So11111111111111111111111111111111111111112", "JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD"] as const;

/** Verified tokens Autopilot may convert to USDC: the given list minus the exceptions and the vault's own token (absorbed directly). */
export function sweepCandidates<T extends { mint: string }>(tokens: readonly T[], vaultMint: string): T[] {
  return tokens.filter((t) => t.mint !== vaultMint && !(AUTOPILOT_SWEEP_EXCLUDED as readonly string[]).includes(t.mint));
}
/** True when a quoted conversion is worth doing. */
export const sweepWorthIt = (usdcOutMicro: bigint) => usdcOutMicro >= AUTOPILOT_SWEEP_MIN_MICRO;
