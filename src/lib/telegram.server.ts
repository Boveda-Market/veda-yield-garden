import type { Announcement } from "./announcements";

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";
export const TELEGRAM_CHANNEL = "@bovedamarket";
const SITE = "https://bovedamarket.app";
const HEAD: Record<Announcement["kind"], string> = { vault: "🏦 NUEVA BÓVEDA", market: "⚡ NUEVO MERCADO", policy: "📜 AVISO IMPORTANTE", update: "🚀 NOVEDAD EN BÓVEDA" };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** HTML post for the official channel; links only to the official domain. */
export function announcementPost(a: Announcement) {
  const link = a.href ? `\n\n🔗 <a href="${SITE}${a.href === "/" ? "" : a.href}">${esc(a.cta ?? "Abrir BÓVEDA")}</a>` : "";
  return `<b>${HEAD[a.kind]}</b>\n\n<b>${esc(a.title)}</b>\n${esc(a.body)}${link}\n\n🛡️ Solo usamos ${SITE.replace("https://", "")}. Nunca te escribiremos primero por privado.`;
}

/** Sends a message through the connector gateway; returns false (never throws) when unavailable. */
export async function sendTelegram(chatId: string, html: string): Promise<boolean> {
  const lk = process.env["LOVABLE_API_KEY"], tk = process.env["TELEGRAM_API_KEY"];
  if (!lk || !tk) return false;
  try {
    const r = await fetch(`${GATEWAY}/sendMessage`, { method: "POST", headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": tk, "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }) });
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

/** Personal account alert to a linked, enabled user; never throws or blocks the caller. */
export async function userAlert(privyUserId: string, html: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("telegram_links").select("chat_id, alerts_enabled").eq("privy_user_id", privyUserId).maybeSingle();
    if (data?.chat_id && data.alerts_enabled) await sendTelegram(String(data.chat_id), `${html}\n\n🛡️ BÓVEDA nunca te pedirá claves ni frases secretas.`);
  } catch { /* alerts are best-effort */ }
}
