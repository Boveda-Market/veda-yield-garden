/** Rotating home headlines. Index 0 is the original; ?v=N forces one (for campaigns). The gta6 variant restyles the whole hero. */
export const HERO_VARIANTS: readonly { title: string; sub: string; theme?: "gta6" | "doble" }[] = [
  { title: "Dólares digitales en autocustodia que generan rendimiento.", sub: "BÓVEDA conecta depósitos en USDC con bóvedas de liquidez y mercados en vivo. $0 por depositar, retiros a banco, Coinbase o Cash App y cada movimiento aprobado con huella o Face ID." },
  { title: "Bóveda GTA6: comisiones generadas por el volumen del mercado.", sub: "Cada compra y venta de la moneda GTA6 reparte comisiones entre quienes aportan liquidez. El Piloto Automático mantiene la posición en rango y las alertas llegan por Telegram.", theme: "gta6" },
  { title: "Bóveda TRUMP: liquidez en uno de los mercados más activos.", sub: "La moneda oficial TRUMP mueve volumen las 24 horas. La bóveda convierte esa actividad en comisiones estimadas en dólares, con retiro disponible en cualquier momento." },
  { title: "Doble o Nada: mercados de predicción en tiempo real.", sub: "Rondas de 5 minutos, 15 minutos y 4 horas sobre Bitcoin, Ethereum y Solana. Se participa en dólares, sin comprar la moneda, y cada ronda se resuelve de forma automática y transparente.", theme: "doble" },
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
