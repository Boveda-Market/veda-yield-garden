/** Rotating home headlines. Index 0 is the original; ?v=N forces one (for campaigns). The gta6 variant restyles the whole hero. */
export const HERO_VARIANTS: readonly { title: string; sub: string; theme?: "gta6" | "doble" | "trump" | "calm" }[] = [
  { title: "Gana en las subidas y en las bajadas, sin la ansiedad de holdear.", sub: "Deposita dólares en una bóveda y cobra intereses de cada compra y venta del mercado. Sin comprar monedas una por una ni vigilar gráficas: el Piloto Automático se encarga. $0 por depositar y retiras cuando quieras." },
  { title: "Bóveda GTA6 Coin: intereses generados por el volumen del mercado.", sub: "Suba o baje GTA6 Coin, cada compra y venta te deja intereses. Sin holdear con ansiedad: el Piloto Automático ajusta tu bóveda y te avisa por Telegram.", theme: "gta6" },
  { title: "Bóveda Trump Coin: liquidez en uno de los mercados más activos.", sub: "Trump Coin mueve volumen las 24 horas. Suba o baje, la bóveda convierte esa actividad en intereses estimados en dólares, con retiro en cualquier momento.", theme: "trump" },
  { title: "Doble o Nada: mercados de predicción en tiempo real.", sub: "Rondas de 5 minutos, 15 minutos y 4 horas sobre Bitcoin, Ethereum y Solana. Se participa en dólares, sin comprar la moneda, y cada ronda se resuelve de forma automática y transparente.", theme: "doble" },
  { title: "Abre tu bóveda y olvídate de las gráficas.", sub: "Comprar y holdear cripto da ansiedad. En Bóveda la volatilidad te paga: cada subida y cada bajada deja intereses, y el Piloto Automático se encarga del resto.", theme: "calm" },
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
