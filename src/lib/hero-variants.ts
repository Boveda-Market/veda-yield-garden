/** Rotating home headlines. Index 0 is the original; ?v=N forces one (for campaigns). */
export const HERO_VARIANTS = [
  { title: " Nada de monedas locas. Genera ganancias reales.", sub: "Todo siempre bajo tu control. $0 para entrar, retira en cualquier momento. Garantizado." },
  { title: "Deja de mirar las gráficas como un bobo. Duplica tus dólares en 300 segundos.", sub: "¿Sube o Baja? Escoge tu bando, confirma con tu huella y cóbrale al mercado antes de que se enfríe tu café. Sin comprar monedas raras: cobras dólares reales al instante." },
  { title: "El banco te da 3% al año. Aquí te llevas hasta +90% en 5 minutos.", sub: "Rondas relámpago de Bitcoin, Ethereum y Solana. Si tienes el timing, te llevas el bote en dólares directo a tu billetera. Si dudas, quédate en el banco." },
  { title: "5 minutos. Dos botones. Tu dinero duplicado o vete a casa.", sub: "Doble o Nada en vivo: juegas contra el mercado en dólares reales. Tú eliges la jugada, nosotros vigilamos el reloj y tu premio cae con un solo toque." },
  { title: "¿Para qué trabajar 8 horas si una jugada de 5 minutos paga el día?", sub: "Predice si Bitcoin sube o baja en la próxima ronda sin comprar la moneda: juegas en dólares y cobras en el acto. Cero humo, pura puntería." },
] as const;

export const HERO_KEY = "boveda-hero-v";

/** Pick a variant: forced URL value wins, then the saved one, else random. */
export function pickHeroVariant(forced: string | null, saved: string | null, rand: number): number {
  const n = HERO_VARIANTS.length;
  const ok = (s: string | null) => s !== null && /^\d+$/.test(s) && Number(s) < n;
  if (ok(forced)) return Number(forced);
  if (ok(saved)) return Number(saved);
  return Math.min(n - 1, Math.floor(rand * n));
}
