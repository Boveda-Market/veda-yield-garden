import { positionWon, type PredictPosition } from "@/lib/predict";
import { tgCard, tgRow } from "@/lib/telegram-format";

export type PredictOutcome = "won" | "lost";

/** Resolved outcome worth notifying: a win with a prize still to claim, or a loss. Open/unknown rounds return null. */
export function resolvedOutcome(p: Pick<PredictPosition, "status" | "result" | "payoutMicro"> & { isYes?: boolean }): PredictOutcome | null {
  if (p.status === "open") return null;
  const won = positionWon(p);
  if (won === true) return BigInt(p.payoutMicro || "0") > 0n ? "won" : null;
  return won === false ? "lost" : null;
}

const usd = (m: string) => (Number(m) / 1e6).toFixed(2);

/** Telegram text for one resolved round (Spanish, HTML). */
export function predictAlertText(p: Pick<PredictPosition, "title" | "payoutMicro" | "costMicro">, o: PredictOutcome): string {
  const round = p.title ? `🎯 <i>${p.title.replace(/[<>&]/g, "")}</i>` : null;
  return o === "won"
    ? tgCard("🏆", "¡Ganaste en Doble o Nada!", [round, tgRow("💵", "Premio", `$${usd(p.payoutMicro)}`), "", "Reclámalo en tu Portafolio cuando quieras.", '👉 <a href="https://bovedamarket.app/portfolio">Reclamar premio</a>'])
    : tgCard("📉", "No acertaste en Doble o Nada", [round, tgRow("💸", "Jugaste", `$${usd(p.costMicro)}`), "", "La ronda terminó en tu contra y la posición se cerró sola."]);
}
