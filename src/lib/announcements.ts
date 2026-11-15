export type AnnouncementKind = "vault" | "market" | "policy" | "update";
export type Announcement = { id: string; date: string; kind: AnnouncementKind; title: string; body: string; href?: "/wallet" | "/terminos" | "/faq" | "/invita" | "/"; cta?: string };

/** Newest first. Add a new entry at the top to publish an update to every user. */
export const ANNOUNCEMENTS: Announcement[] = [
  { id: "2026-11-15-gta6-portfolio", date: "2026-11-15", kind: "update", title: "Bóveda GTA6, Portafolio renovado y rebalanceo en 1 toque", body: "Hoy llegaron más de 40 mejoras. Esto es lo más importante:\n🎰 Bóveda GTA6: nueva bóveda de alto rendimiento con el concepto «Sé la casa»: cobras comisiones de cada intercambio, con APR en vivo y un medidor de zona caliente.\n🎯 Rebalanceo en 1 toque: si tu bóveda sale de rango, el botón Rebalancear aparece al instante en tu tarjeta. A los 10 minutos te avisamos en Telegram y en la campanita.\n🔁 Migrar sin comisión: mueve tu dinero a otra bóveda desde tu tarjeta activa, en una sola ventana. Tus bóvedas activas salen primero, ordenadas por mayor APR.\n📊 Portafolio renovado: tus posiciones abiertas siempre arriba y el tablero «Tu rendimiento» con tu capital por bóveda, APR promedio, lo que tienes por cosechar y tus ganancias.\n🌾 Cosechas más claras: Cosechar y Reinvertir se activan desde $0.50 de ganancias, y la otra moneda se convierte sola a dólares.\n💼 Mi Billetera más rápida: tus balances aparecen justo al entrar, con acceso directo a la Bóveda GTA6 y a Doble o Nada en la primera pantalla.\n🧾 Operaciones sin sorpresas: «Otra cantidad» en todas las operaciones, cada movimiento con su nombre real en Tu actividad y, si algo falla, «Intentar de nuevo» con un toque.\n📚 Nueva guía: aprende a sacarle el máximo a las bóvedas de alto rendimiento en la sección Guías.", href: "/", cta: "Explorar Bóvedas" },
  { id: "2026-11-zero-friction", date: "2026-11-14", kind: "update", title: "Más velocidad, transparencia y cero fricción", body: "🎯 Sube y Baja: rondas de 5 min, 15 min y 4 horas; gráfica Duelo que muestra cuánto vas sobre o bajo el precio a batir; al llegar a 00:00 se espera el resultado oficial; si una orden no entra, te avisamos y tu reembolso queda listo en Mi Billetera.\n💼 Mi Billetera: premios, reembolsos y sobrantes pasan a tus dólares disponibles con 1 toque, sin comisión; tu balance total los incluye y recargas tu reserva de operaciones en segundos.\n🏛️ Bóvedas: Cosechar, Reinvertir y Liquidar directo en tus tarjetas; al liquidar, los sobrantes se convierten a dólares.\n📱 Celular: hojas deslizables para depositar, cambiar y retirar, y comprobantes claros al terminar cada operación.", href: "/", cta: "Probar ahora" },
  { id: "2026-11-security-performance", date: "2026-11-14", kind: "update", title: "Actualización mayor: seguridad, velocidad y Gráfica Pro", body: "📊 Gráfica Pro en Sube/Baja: velas con EMA, temporalidades 1m, 5m, 15m, 30m y 1h, zoom táctil y línea del precio a batir. Nuevas rondas de 4 horas.\n⚡ Precios y balances en vivo sin recargar, cierre anticipado de posiciones, alertas en Telegram aunque tengas la app cerrada y liquidaciones que convierten todo a USDC.\n🔒 Firmas guiadas paso a paso (1 de 2 / 2 de 2), recarga de reserva de red con USDC en un toque y validación estricta en el servidor: solo tus wallets autorizadas pueden operar.", href: "/", cta: "Probar ahora" },
  { id: "2026-11-fair-fees-redesign", date: "2026-11-13", kind: "policy", title: "$0 por depositar y una app más limpia", body: "Depositar en cualquier bóveda ahora cuesta $0: solo pagas un pequeño porcentaje al cosechar o retirar. Niveles Básico, Plus, Pro y VIP: más capital, menor tarifa; en la cosecha cuenta tu capital total. Mover a mayor APR es gratis y el cambio voluntario cuesta 0.10%. Bóvedas ahora es un catálogo limpio, Portafolio resume tu rendimiento y Sube o Baja tiene un tablero en vivo más ágil.", href: "/terminos", cta: "Ver términos" },
  { id: "2026-11-fee-tiers", date: "2026-11-13", kind: "policy", title: "Nuevas comisiones por niveles: más mueves, menos pagas", body: "Más mueves, menos pagas. Depositar, enviar, cambiar monedas y entrar a Sube/Baja es gratis. Siempre ves la comisión antes de firmar. El detalle completo está en Términos y condiciones.", href: "/terminos", cta: "Ver términos" },
  { id: "2026-11-funding-upgrades", date: "2026-11-12", kind: "update", title: "Añadir y retirar fondos, más fácil", body: "Retiros a tu saldo de Coinbase al instante, con firma automática al volver a BÓVEDA. Compra con tarjeta o Apple Pay guiada en dólares (sugerido $100, mínimo $50) y activación de dólares estable desde $0.50.", href: "/wallet", cta: "Ir a Mi Billetera" },
  { id: "2026-11-vault-move", date: "2026-11-12", kind: "vault", title: "Traslado a bóvedas con mayor APR", body: "Si otra bóveda rinde al menos 5% más, muévete en 2 pasos o usa «Cosechar y reinvertir todo» para sumar tus ganancias al capital.", href: "/", cta: "Ir a Bóvedas" },
  { id: "2026-11-telegram-alerts", date: "2026-11-12", kind: "update", title: "Alertas personales en Telegram", body: "Conecta BÓVEDA Alertas (@bovedamarketbot) desde Tu cuenta y recibe avisos privados de cosechas, Sube/Baja, retiros y comisiones.", href: "/wallet", cta: "Ir a Mi Billetera" },
  { id: "2026-11-coinbase", date: "2026-11-12", kind: "update", title: "Añade y retira fondos con Coinbase", body: "Ahora puedes añadir fondos y retirar a tu banco con Coinbase directamente desde Mi Billetera.", href: "/wallet", cta: "Ir a Mi Billetera" },
  { id: "2026-11-fees", date: "2026-11-01", kind: "policy", title: "Comisiones por niveles: más mueves, menos pagas", body: "Cuanto mayor es el monto, menor el porcentaje. Siempre ves la comisión antes de firmar.", href: "/terminos", cta: "Ver términos" },
];

export const latestAnnouncementId = () => ANNOUNCEMENTS[0]?.id ?? "";
export const SEEN_KEY = "boveda.news.seen";
export const DISMISSED_KEY = "boveda.news.dismissed";

/** Announcements already posted to the Telegram channel (plus ones marked locally by the operator). */
export const PUBLISHED_IDS = ["2026-11-15-gta6-portfolio", "2026-11-zero-friction", "2026-11-security-performance"];
export const PUBLISHED_KEY = "boveda-admin-published";
export function readPublished(): string[] {
  try { return [...PUBLISHED_IDS, ...JSON.parse(localStorage.getItem(PUBLISHED_KEY) || "[]")]; } catch { return PUBLISHED_IDS; }
}
export function markPublished(id: string) {
  try { const s = new Set(readPublished()); s.add(id); localStorage.setItem(PUBLISHED_KEY, JSON.stringify([...s])); window.dispatchEvent(new Event("boveda-published")); } catch { /* ignore */ }
}

export type AnnouncementItem = { icon: string; title: string; text: string };
const EMOJI_START = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u20E3|\u200D\p{Extended_Pictographic})*)\s*/u;
/** Splits a body into a plain lead and emoji-led highlight items ("🎯 Title: text"), so posts render as scannable cards instead of a wall of text. */
export function announcementSections(body: string): { lead: string; items: AnnouncementItem[] } {
  const lead: string[] = [];
  const items: AnnouncementItem[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(EMOJI_START);
    if (!m) { lead.push(line); continue; }
    const icon = m[1] ?? "", rest = line.slice(m[0].length);
    const i = rest.indexOf(": ");
    items.push(i > 0 && i <= 48 ? { icon, title: rest.slice(0, i), text: rest.slice(i + 2).replace(/^./, (c) => c.toUpperCase()) } : { icon, title: "", text: rest });
  }
  return { lead: lead.join(" "), items };
}
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** "2026-11-15" → "15 nov 2026" (timezone-free so server and browser agree). */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : iso;
}
