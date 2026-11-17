/** Rotating home headlines. Index 0 is the original; ?v=N forces one (for campaigns). The gta6 variant restyles the whole hero. */
export const HERO_VARIANTS: readonly { title: string; sub: string; theme?: "gta6" | "doble" }[] = [
  { title: " Nada de monedas locas. Genera ganancias reales.", sub: "Todo siempre bajo tu control. $0 para entrar, retira en cualquier momento. Garantizado." },
  { title: "Deja de mirar las gráficas como un bobo. Duplica tus dólares en 300 segundos.", sub: "¿Sube o Baja? Escoge tu bando, confirma con tu huella y cóbrale al mercado antes de que se enfríe tu café. Sin comprar monedas raras: cobras dólares reales al instante." },
  { title: "El banco te da 3% al año. Aquí te llevas hasta +90% en 5 minutos.", sub: "Rondas relámpago de Bitcoin, Ethereum y Solana. Si tienes el timing, te llevas el bote en dólares directo a tu billetera. Si dudas, quédate en el banco." },
  { title: "5 minutos. Dos botones. Tu dinero duplicado o vete a casa.", sub: "Doble o Nada en vivo: juegas contra el mercado en dólares reales. Tú eliges la jugada, nosotros vigilamos el reloj y tu premio cae al instante." },
  { title: "¿Para qué trabajar 8 horas si una jugada de 5 minutos paga el día?", sub: "Predice si Bitcoin sube o baja en la próxima ronda sin comprar la moneda: juegas en dólares y cobras en el acto. Cero humo, pura puntería." },
  { title: "Mientras todos esperan el juego, tú cobras como la casa.", sub: "Cada compra y venta de GTA6 te deja intereses. Deposita, recibe la alerta en Telegram y rebalancea cuando te toque.", theme: "gta6" },
  { title: "Los demás van a gastar en el juego. Tú vas a cobrarles el peaje.", sub: "Pon tus dólares en la bóveda de mayor volumen. Cada compra y venta de GTA6 te deja intereses en automático, día y noche.", theme: "gta6" },
  { title: "El lanzamiento más grande de la historia. Tu saldo cobrando cada segundo.", sub: "Millones van a mover GTA6 sin parar. Conviértete en la casa y quédate con una tajada de cada transacción antes de que salga el juego.", theme: "gta6" },
  { title: "No esperes a jugar GTA6. Sé el dueño del banco.", sub: "La bóveda de alto octanaje que convierte el furor mundial en dólares diarios para ti. Sin vueltas técnicas y con retiro libre en cualquier momento.", theme: "gta6" },
  { title: "Bóveda GTA6: Intereses brutales impulsados por pura adrenalina.", sub: "Aprovecha los intereses más agresivos del mercado. Entras en segundos, el piloto automático cuida tu rango y tus ganancias crecen solas.", theme: "gta6" },
  { title: "Mientras el mundo se desvive por GTA6, tú cobras sentado.", sub: "Cada intercambio del juego te paga intereses directo a tu billetera. Cero monedas raras: generas dólares reales con piloto automático.", theme: "gta6" },
  { title: "Predicciones de Bitcoin en vivo: duplica tus dólares en 5 minutos.", sub: "¿Sube o Baja? Sin comprar monedas raras: eliges tu bando en rondas relámpago de Bitcoin, Ethereum y Solana, juegas en dólares y cobras directo a tu billetera al terminar el reloj.", theme: "doble" },
  { title: "Doble o Nada: la forma más rápida de multiplicar tu dinero prediciendo el mercado.", sub: "Dos botones, rondas de 300 segundos y premios en dólares reales. Olvídate de gráficas complicadas: pon a prueba tu puntería y retira cuando quieras.", theme: "doble" },
  { title: "Los bancos te dan centavos al año. Una ronda de 5 minutos te paga el día.", sub: "Entra al mercado de predicciones en vivo en español. Elige si el precio sube o baja, confirma con tu huella y llévate hasta +90% en dólares en una sola jugada.", theme: "doble" },
  { title: "5 minutos. Dos opciones. Tus dólares duplicados en tiempo real.", sub: "Juega Doble o Nada con Bitcoin, Ethereum y Solana. Entrar es gratis y tus premios llegan en dólares a tu billetera.", theme: "doble" },
  { title: "¿Sube o baja? La jugada de 300 segundos donde tu instinto vale oro.", sub: "Predice el movimiento del mercado en vivo. Si aciertas la tendencia, cobras dólares limpios y puedes retirar en cualquier momento.", theme: "doble" },
];

/** Index of the GTA6 launch variant and the share of new visitors who see it. */
export const GTA6_HERO = HERO_VARIANTS.findIndex((v) => v.theme === "gta6");
export const GTA6_HEROES = HERO_VARIANTS.map((v, i) => (v.theme === "gta6" ? i : -1)).filter((i) => i >= 0);
export const GTA6_HERO_SHARE = 0.4;

export const HERO_KEY = "boveda-hero-v";

/** Pick a variant: forced URL value wins, then the saved one, else random. */
export function pickHeroVariant(forced: string | null, saved: string | null, rand: number): number {
  const n = HERO_VARIANTS.length;
  const ok = (s: string | null) => s !== null && /^\d+$/.test(s) && Number(s) < n;
  if (ok(forced)) return Number(forced);
  if (ok(saved)) return Number(saved);
  const g = GTA6_HEROES;
  if (g.length && rand < GTA6_HERO_SHARE) return g[Math.min(g.length - 1, Math.floor((rand / GTA6_HERO_SHARE) * g.length))]!;
  // Remaining visitors split evenly among the other variants.
  const others = HERO_VARIANTS.map((_, i) => i).filter((i) => !g.includes(i));
  const r = g.length ? (rand - GTA6_HERO_SHARE) / (1 - GTA6_HERO_SHARE) : rand;
  return others[Math.min(others.length - 1, Math.floor(r * others.length))]!;
}

/** Preview host or a forced ?v= link: show the full landing (no returning-user shortcut) so variants can be reviewed. */
export function isHeroReview(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h.includes("id-preview") || h === "localhost" || new URLSearchParams(window.location.search).has("v");
}
