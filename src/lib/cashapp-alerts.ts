import { NO_ACTION_LINE, tgCard, tgRow } from "./telegram-format";

/** SideShift shift states that end a Cash App withdrawal. */
export type CashAppOutcome = "settled" | "refunded";
export function cashAppOutcome(status: string): CashAppOutcome | null {
  if (status === "settled") return "settled";
  if (status === "refunded" || status === "refund") return "refunded";
  return null;
}
/** Withdrawals stop being followed after 24 h so stuck orders never poll forever. */
export const CASHAPP_TRACK_MS = 24 * 60 * 60 * 1000;
export const cashAppTrackExpired = (createdAt: string, now: number) => now - new Date(createdAt).getTime() > CASHAPP_TRACK_MS;

const btcRow = (btc: string) => (/^\d+(\.\d{1,8})?$/.test(btc) ? tgRow("₿", "Bitcoin", `≈ ${btc} BTC`) : null);

export const cashAppSentText = (btc: string) => tgCard("🏧", "Retiro a Cash App en camino", [btcRow(btc), "", "Tus dólares ya se enviaron para cambiarlos a Bitcoin.", "⏳ Llega en unos 15 a 30 minutos.", "🔔 Te avisaremos aquí cuando llegue.", NO_ACTION_LINE]);
export const cashAppSettledText = (btc: string) => tgCard("✅", "¡Bitcoin entregado en Cash App!", [btcRow(btc), "", "Abre Cash App para ver tu saldo de Bitcoin.", NO_ACTION_LINE]);
export const cashAppRefundedText = () => tgCard("↩️", "Retiro a Cash App devuelto", ["El proveedor no pudo completar el cambio a Bitcoin.", "💵 Tus dólares regresaron a tu billetera.", NO_ACTION_LINE]);
