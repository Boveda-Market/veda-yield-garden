/** Rotating home headlines. Index 0 is the original; ?v=N forces one (for campaigns). The gta6 variant restyles the whole hero. */
export const HERO_VARIANTS: readonly { title: string; sub: string; theme?: "gta6" }[] = [
  { title: " Nada de monedas locas. Genera ganancias reales.", sub: "Todo siempre bajo tu control. $0 para entrar, retira en cualquier momento. Garantizado." },
  { title: "Deja de mirar las gráficas como un bobo. Duplica tus dólares en 300 segundos.", sub: "¿Sube o Baja? Escoge tu bando, confirma con tu huella y cóbrale al mercado antes de que se enfríe tu café. Sin comprar monedas raras: cobras dólares reales al instante." },
  { title: "El banco te da 3% al año. Aquí te llevas hasta +90% en 5 minutos.", sub: "Rondas relámpago de Bitcoin, Ethereum y Solana. Si tienes el timing, te llevas el bote en dólares directo a tu billetera. Si dudas, quédate en el banco." },
  { title: "5 minutos. Dos botones. Tu dinero duplicado o vete a casa.", sub: "Doble o Nada en vivo: juegas contra el mercado en dólares reales. Tú eliges la jugada, nosotros vigilamos el reloj y tu premio cae con un solo toque." },
  { title: "¿Para qué trabajar 8 horas si una jugada de 5 minutos paga el día?", sub: "Predice si Bitcoin sube o baja en la próxima ronda sin comprar la moneda: juegas en dólares y cobras en el acto. Cero humo, pura puntería." },
  { title: "Mientras todos esperan el juego, tú cobras como la casa.", sub: "Cada compra y venta de GTA6 te deja comisión. Deposita, recibe la alerta en Telegram y rebalancea con 1 toque.", theme: "gta6" },
];

/** Index of the GTA6 launch variant and the share of new visitors who see it. */
export const GTA6_HERO = HERO_VARIANTS.findIndex((v) => v.theme === "gta6");
export const GTA6_HERO_SHARE = 0.4;

export const HERO_KEY = "boveda-hero-v";

/** Pick a variant: forced URL value wins, then the saved one, else random. */
export function pickHeroVariant(forced: string | null, saved: string | null, rand: number): number {
  const n = HERO_VARIANTS.length;
  const ok = (s: string | null) => s !== null && /^\d+$/.test(s) && Number(s) < n;
  if (ok(forced)) return Number(forced);
  if (ok(saved)) return Number(saved);
  if (GTA6_HERO >= 0 && rand < GTA6_HERO_SHARE) return GTA6_HERO;
  // Remaining visitors split evenly among the other variants.
  const others = HERO_VARIANTS.map((_, i) => i).filter((i) => i !== GTA6_HERO);
  const r = GTA6_HERO >= 0 ? (rand - GTA6_HERO_SHARE) / (1 - GTA6_HERO_SHARE) : rand;
  return others[Math.min(others.length - 1, Math.floor(r * others.length))]!;
}

/** Preview host or a forced ?v= link: show the full landing (no returning-user shortcut) so variants can be reviewed. */
export function isHeroReview(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h.includes("id-preview") || h === "localhost" || new URLSearchParams(window.location.search).has("v");
}
