import { positionWon, type PredictPosition } from "@/lib/predict";

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
  const round = p.title ? `\n${p.title.replace(/[<>&]/g, "")}` : "";
  return o === "won"
    ? `🏆 <b>¡Ganaste en Sube/Baja!</b>${round}\nTu premio de ${usd(p.payoutMicro)} USDC está listo. Reclámalo en tu Portafolio cuando quieras.\nhttps://bovedamarket.app/portfolio`
    : `📉 <b>No acertaste en Sube/Baja</b>${round}\nLa ronda terminó en tu contra; invertiste ${usd(p.costMicro)} USDC. La posición se cerró sola.`;
}
