import { TG_RULE, tgEsc } from "./telegram-format";

/** Narrative tag per vault: what real-world story drives its trading volume. Future vaults fall back to the generic tag. */
export const VAULT_NARRATIVE: Record<string, { icon: string; theme: string; story: string }> = {
  gta6: { icon: "🎮", theme: "Narrativa GTA VI", story: "Cada rumor, tráiler o filtración de Rockstar sobre Vice City dispara compras y ventas." },
  dcty: { icon: "🌆", theme: "Narrativa GTA VI", story: "DacityCoin, la cripto vista en GTA 6, se mueve con cada noticia del juego." },
  trump: { icon: "🏛️", theme: "Narrativa política", story: "Cada titular, discurso o decisión económica de Trump sacude el precio al instante." },
  sol: { icon: "⚡", theme: "Red principal", story: "Termómetro del ánimo general: cuando el mercado se activa, sube el volumen." },
  met: { icon: "🧱", theme: "Infraestructura", story: "Se mueve con la actividad de los intercambios descentralizados." },
};
const GENERIC = { icon: "🔥", theme: "Narrativa propia", story: "Se mueve con las noticias y la comunidad de su sector." };

export type PulseCoin = { sym: string; price: number; change24h: number | null };
export type PulseVault = { id: string; name: string; volume24h: number | null; apr: number | null };
export type PulseInput = { date: string; fng: { value: number; label: string } | null; majors: PulseCoin[]; vaults: PulseVault[]; headline?: string };

const FNG_ES: Record<string, string> = { "Extreme Fear": "Miedo extremo", Fear: "Miedo", Neutral: "Neutral", Greed: "Codicia", "Extreme Greed": "Codicia extrema" };
const usd = (n: number) => n >= 1000 ? `$${Math.round(n).toLocaleString("en-US")}` : n >= 1 ? `$${n.toFixed(2)}` : `$${n.toPrecision(3)}`;
const pct = (n: number | null) => n === null ? "" : ` (${n >= 0 ? "+" : ""}${n.toFixed(1)}% 24h)`;
const compact = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(0)}`;

/** Sentence read from the Fear & Greed score: fear = discount mood, greed = frenzy; both mean volume for liquidity providers. */
export function moodLine(v: number) {
  if (v <= 25) return "El mercado tiene miedo: hay pánico y ventas, y muchos esperan el rebote.";
  if (v <= 45) return "Ánimo cauteloso: el mercado duda y se mueve en ambos sentidos.";
  if (v <= 55) return "Mercado neutral: ni euforia ni pánico.";
  if (v <= 75) return "Vuelve el apetito: más compradores entrando.";
  return "Euforia: compras agresivas y mucho movimiento.";
}

/** Weekly channel post (HTML). Vaults are sorted by 24h volume so the hottest narrative leads. */
export function marketPulsePost(p: PulseInput) {
  const head = [`<b>🔥 PULSO SEMANAL DEL MERCADO</b>  ·  <i>${tgEsc(p.date)}</i>`, TG_RULE, "<i>Lo que mueve el mercado y dónde se están generando comisiones.</i>"].join("\n");
  const blocks: string[] = [];
  if (p.headline) blocks.push(`⚡ <b>El catalizador de la semana</b>\n${tgEsc(p.headline)}`);
  if (p.fng) blocks.push(`🌡️ <b>Sentimiento: ${tgEsc(FNG_ES[p.fng.label] ?? p.fng.label)} (${p.fng.value}/100)</b>\n${moodLine(p.fng.value)}`);
  if (p.majors.length) blocks.push(`📊 <b>Monedas principales</b>\n${p.majors.map((c) => `• ${tgEsc(c.sym)}: ${usd(c.price)}${pct(c.change24h)}`).join("\n")}`);
  const vs = [...p.vaults].sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0));
  for (const v of vs) {
    const n = VAULT_NARRATIVE[v.id] ?? GENERIC;
    const stats = [v.volume24h !== null ? `Volumen 24h ${compact(v.volume24h)}` : null, v.apr !== null ? `~${v.apr.toFixed(0)}% anual estimado` : null].filter(Boolean).join(" · ");
    blocks.push(`${n.icon} <b>${tgEsc(v.name)} · ${tgEsc(n.theme)}</b>\n${tgEsc(n.story)}${stats ? `\n<i>${stats}</i>` : ""}`);
  }
  blocks.push("💡 <b>Tú eres la casa</b>\nNo tienes que adivinar si sube o baja: tu bóveda cobra una parte de cada compra y venta, y el Piloto Automático la mantiene en rango.");
  return [head, ...blocks, `${TG_RULE}\n<blockquote>🛡️ Solo usamos bovedamarket.app. Nunca te escribiremos primero por privado.</blockquote>`].join("\n\n");
}

export const PULSE_DRAFT_LABEL = "📝 <b>BORRADOR SEMANAL · REVISIÓN PRIVADA</b>\n<i>No se ha publicado. Responde en el chat de BÓVEDA para aprobarlo.</i>";
