import { TG_RULE, tgEsc } from "./telegram-format";

/** First promo day (UTC); one promo every 14 days on a pseudo-random day of each cycle. */
export const PROMO_START = Date.UTC(2026, 10, 22);
const DAY = 86_400_000;
const hash = (n: number) => { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; return x >>> 0; };

/** Cycle index when today is its promo day, else null. Cycle 0 fires on the start day. */
export function promoCycleFor(now: number): number | null {
  const d = Math.floor((now - PROMO_START) / DAY);
  if (d < 0) return null;
  const c = Math.floor(d / 14);
  const offset = c === 0 ? 0 : hash(c) % 14;
  return d % 14 === offset ? c : null;
}

export const PROMO_KINDS = ["case", "volume", "calc"] as const;
export type PromoKind = (typeof PROMO_KINDS)[number];
export const promoKindFor = (cycle: number): PromoKind => PROMO_KINDS[cycle % 3]!;

export type PromoVault = { id: string; name: string; volume24h: number | null; apr: number | null };
export const PROMO_DRAFT_LABEL = "📝 <b>BORRADOR PROMOCIONAL · REVISIÓN PRIVADA</b>\nSolo tú lo ves. Toca «Publicar» para enviarlo al canal.";
/** Example amounts never exceed $2,500. */
export const PROMO_MAX_USD = 2500;

const usd = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(0)}`;
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (a: number) => `${a >= 100 ? Math.round(a).toLocaleString("en-US") : a.toFixed(0)}%`;
const SITE = "https://bovedamarket.app";

/** Builds the promo post; every figure is an illustrative estimate from live pool data, labelled as such. */
export function promoPost(kind: PromoKind, v: PromoVault, seed: number): string {
  const apr = v.apr ?? 0;
  const foot = `${TG_RULE}\n<i>Ejemplo ilustrativo con datos actuales del mercado; no es una operación real ni garantiza rendimientos.</i>\n👉 ${SITE}`;
  if (kind === "case") {
    const amt = [1000, 1500, 2000, 2500][seed % 4]!;
    const week = (amt * apr) / 100 / 52;
    return [`<b>⚡ CASO DE RENDIMIENTO · ${tgEsc(v.name)}</b>`, TG_RULE, `Así trabajaría una posición de <b>${money(amt)}</b> con el volumen de esta semana:`,
      `🎯 <b>Piloto Automático:</b> rebalancea solo para mantener la posición en la zona de intercambio.`,
      `🌾 <b>Comisiones estimadas:</b> ~${money(week)} por semana (${pct(apr)} anual estimado).`,
      `🛡️ <b>Tu control:</b> cobras o retiras cuando quieras.`, `<i>Tú pones el capital, el Piloto se encarga del resto.</i>`, foot].join("\n\n");
  }
  if (kind === "volume") {
    return [`<b>🔥 MOVIMIENTO DEL MERCADO · ${tgEsc(v.name)}</b>`, TG_RULE,
      `Se movieron <b>${usd(v.volume24h ?? 0)}</b> en las últimas 24 h.`,
      `Mientras otros adivinan si sube o baja, las bóvedas cobran una parte de cada compra y venta.`,
      `💡 <i>En el mercado digital, es mejor ser la casa.</i>`, foot].join("\n\n");
  }
  const rows = [500, 1500, PROMO_MAX_USD].map((a) => `• Con ${money(a)}: ~${money((a * apr) / 100 / 12)} al mes estimado`);
  return [`<b>💡 ¿CUÁNTO PODRÍA GENERAR TU DINERO?</b>`, TG_RULE, `En la ${tgEsc(v.name)}, con el ritmo actual (${pct(apr)} anual estimado):`, rows.join("\n"),
    `🌾 Ganancias en dólares, cobrables cuando quieras.`, foot].join("\n\n");
}
