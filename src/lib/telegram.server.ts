import { alertAllowed, parseMuted, type AlertKind } from "./alert-kinds";
import { announcementSections, shortDate, type Announcement } from "./announcements";
import { TG_RULE, TG_SAFETY, tgEsc } from "./telegram-format";

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";
export const TELEGRAM_CHANNEL = "@bovedamarket";
const SITE = "https://bovedamarket.app";
const HEAD: Record<Announcement["kind"], string> = { vault: "🏦 NUEVA BÓVEDA", market: "⚡ NUEVO MERCADO", policy: "📜 AVISO IMPORTANTE", update: "🚀 NOVEDADES" };

/** Channel post: header + date, bold title, short lead, then one spaced block per highlight; the CTA travels as a button. */
export function announcementPost(a: Announcement) {
  const { lead, items } = announcementSections(a.body);
  const top = [`<b>${HEAD[a.kind]}</b>  ·  <i>${shortDate(a.date)}</i>`, TG_RULE, `<b>${tgEsc(a.title)}</b>`, ...(lead ? [`<i>${tgEsc(lead)}</i>`] : [])].join("\n");
  const blocks = items.map((it) => it.title ? `${it.icon} <b>${tgEsc(it.title)}</b>\n${tgEsc(it.text)}` : `${it.icon} ${tgEsc(it.text)}`);
  return [top, ...blocks, `${TG_RULE}\n<blockquote>🛡️ Solo usamos ${SITE.replace("https://", "")}. Nunca te escribiremos primero por privado.</blockquote>`].join("\n\n");
}
/** Tappable button under the channel post (official domain only). */
export function announcementButton(a: Announcement): TelegramButton | undefined {
  return a.href ? { text: `👉 ${a.cta ?? "Abrir BÓVEDA"}`, url: `${SITE}${a.href === "/" ? "" : a.href}` } : undefined;
}

export type TelegramButton = { text: string; url: string };
/** Sends a message (optionally with one tappable link button) through the connector gateway; returns false (never throws) when unavailable. */
export async function sendTelegram(chatId: string, html: string, button?: TelegramButton): Promise<boolean> {
  const lk = process.env["LOVABLE_API_KEY"], tk = process.env["TELEGRAM_API_KEY"];
  if (!lk || !tk) return false;
  try {
    const r = await fetch(`${GATEWAY}/sendMessage`, { method: "POST", headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": tk, "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true, ...(button ? { reply_markup: { inline_keyboard: [[button]] } } : {}) }) });
    if (!r.ok) { console.error(`Telegram sendMessage failed [${r.status}]: ${await r.text()}`); return false; }
    return ((await r.json()) as { ok?: boolean }).ok === true;
  } catch (e) { console.error("Telegram sendMessage error", e); return false; }
}

/** Private operator alert; silently skipped until TELEGRAM_ALERT_CHAT_ID is set. */
export async function treasuryAlert(html: string) {
  const chat = process.env["TELEGRAM_ALERT_CHAT_ID"];
  if (chat) await sendTelegram(chat, html);
}
export const usdcText = (raw: bigint | number | string) => (Number(raw) / 1e6).toFixed(2);

/** Personal account alert to a linked, enabled user (skipped when that kind is muted); never throws or blocks the caller. */
export async function userAlert(privyUserId: string, html: string, kind?: AlertKind, button?: TelegramButton) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // "*" keeps alerts working even before the muted_kinds column exists.
    const { data } = await supabaseAdmin.from("telegram_links").select("*").eq("privy_user_id", privyUserId).maybeSingle();
    const row = data as { chat_id: number | null; alerts_enabled: boolean; muted_kinds?: unknown } | null;
    if (row?.chat_id && alertAllowed(row.alerts_enabled, parseMuted(row.muted_kinds), kind)) await sendTelegram(String(row.chat_id), `${html}\n\n${TG_SAFETY}`, button);
  } catch { /* alerts are best-effort */ }
}

const PULSE_PUB = "pulse:pub";
const SITE_BUTTON: TelegramButton = { text: "👉 Abrir BÓVEDA", url: SITE };
async function tgCall(method: string, body: Record<string, unknown>) {
  const lk = process.env["LOVABLE_API_KEY"], tk = process.env["TELEGRAM_API_KEY"];
  if (!lk || !tk) return null;
  const r = await fetch(`${GATEWAY}/${method}`, { method: "POST", headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": tk, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) { console.error(`Telegram ${method} failed [${r.status}]: ${await r.text()}`); return null; }
  return (await r.json()) as { ok?: boolean; result?: unknown };
}

/** Private draft for the operator: a label, then the clean post with a "Publicar" button that copies it to the channel. */
export async function sendPulseDraft(label: string, post: string) {
  const chat = process.env["TELEGRAM_ALERT_CHAT_ID"];
  if (!chat) return false;
  await sendTelegram(chat, label);
  const r = await tgCall("sendMessage", { chat_id: chat, text: post, parse_mode: "HTML", disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [[SITE_BUTTON], [{ text: "✅ Publicar en el canal", callback_data: PULSE_PUB }]] } });
  return r?.ok === true;
}

/** Handles the "Publicar" tap: only the operator's own chat may publish; copies that exact message to the channel once. */
export async function handlePulseCallback(cb: { id: string; data?: string; from?: { id?: number }; message?: { message_id?: number; chat?: { id?: number } } }) {
  if (cb.data !== PULSE_PUB) return;
  const op = process.env["TELEGRAM_ALERT_CHAT_ID"];
  const chatId = cb.message?.chat?.id, msgId = cb.message?.message_id;
  if (!op || String(chatId) !== op || String(cb.from?.id) !== op || !msgId) { await tgCall("answerCallbackQuery", { callback_query_id: cb.id, text: "No autorizado" }); return; }
  const done = await tgCall("copyMessage", { chat_id: TELEGRAM_CHANNEL, from_chat_id: op, message_id: msgId, reply_markup: { inline_keyboard: [[SITE_BUTTON]] } });
  if (done?.ok) {
    await tgCall("editMessageReplyMarkup", { chat_id: op, message_id: msgId, reply_markup: { inline_keyboard: [[{ text: "✅ Publicado en @bovedamarket", url: "https://t.me/bovedamarket" }]] } });
    await tgCall("answerCallbackQuery", { callback_query_id: cb.id, text: "✅ Publicado en el canal" });
  } else await tgCall("answerCallbackQuery", { callback_query_id: cb.id, text: "⚠️ No se pudo publicar, intenta de nuevo", show_alert: true });
}
