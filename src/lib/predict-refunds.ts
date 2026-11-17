import { tgCard, tgRow } from "@/lib/telegram-format";
/** Sube/Baja orders that never entered the round: the venue refunds them automatically (order_failed in its history). */
export type PredictOrderState = "pending" | "filled" | "refunded";
export type PredictRefund = { order: string; marketId: string; title: string; amountMicro: string; at: number };

const PUBKEY = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
/** Refunds older than this stop showing in the bell and the wallet. */
export const REFUND_SHOW_SEC = 24 * 3600;

/** Maps the venue's order status to what the user needs to know. Unknown/"created" stays pending. */
export function orderStateOf(status: string | null | undefined): PredictOrderState {
  if (status === "filled" || status === "partiallyfilled") return "filled";
  if (status === "failed") return "refunded";
  return "pending";
}

type HistoryEvent = { eventType?: string; orderPubkey?: string; marketId?: string; isBuy?: boolean; transferAmountToken?: string | null; timestamp?: number; eventMetadata?: { title?: string } | null };

/** Recent failed buy orders (one per order), newest first. */
export function refundsFromHistory(events: readonly HistoryEvent[], nowSec: number, maxAgeSec = REFUND_SHOW_SEC): PredictRefund[] {
  const seen = new Map<string, PredictRefund>();
  for (const e of events) {
    if (e.eventType !== "order_failed" || e.isBuy !== true || !e.orderPubkey || !PUBKEY.test(e.orderPubkey)) continue;
    const at = Number(e.timestamp ?? 0);
    if (!Number.isFinite(at) || at <= 0 || nowSec - at > maxAgeSec) continue;
    const amt = /^\d{1,15}$/.test(e.transferAmountToken ?? "") ? e.transferAmountToken! : "0";
    if (BigInt(amt) <= 0n || seen.has(e.orderPubkey)) continue;
    seen.set(e.orderPubkey, { order: e.orderPubkey, marketId: e.marketId ?? "", title: (e.eventMetadata?.title ?? "").slice(0, 160), amountMicro: amt, at });
  }
  return [...seen.values()].sort((a, b) => b.at - a.at);
}

const usd = (m: string) => (Number(m) / 1e6).toFixed(2);

/** Telegram text for one refunded order (Spanish, HTML). */
export function refundAlertText(r: Pick<PredictRefund, "title" | "amountMicro">): string {
  const round = r.title ? `🎯 <i>${r.title.replace(/[<>&]/g, "")}</i>` : null;
  return tgCard("↩️", "Te devolvimos tu jugada", [round, tgRow("💵", "Reembolso", `$${usd(r.amountMicro)} completos`), "", "No entró a la ronda porque el precio cambió en ese instante. Ya está lista en Mi Billetera.", "✨ <b>No tienes que hacer ninguna acción.</b>", '👉 <a href="https://bovedamarket.app/wallet">Ir a Mi Billetera</a>']);
}
