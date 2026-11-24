/** Home headlines. "/" rotates them by weight; each one also has its own address (HERO_SLUGS) for campaigns. */
export const HERO_VARIANTS: readonly { title: string; sub: string; theme?: "gta6" | "doble" | "trump" | "calm" | "bitcoin" }[] = [
  { title: "Gana en las subidas y en las bajadas, sin la ansiedad de holdear.", sub: "Deposita dólares en una bóveda y cobra intereses de cada compra y venta del mercado. Sin comprar monedas una por una ni vigilar gráficas: el Piloto Automático se encarga. $0 por depositar y retiras cuando quieras." },
  { title: "Bóveda GTA6 Coin: intereses generados por el volumen del mercado.", sub: "Suba o baje GTA6 Coin, cada compra y venta te deja intereses. Sin holdear con ansiedad: el Piloto Automático ajusta tu bóveda y te avisa por Telegram.", theme: "gta6" },
  { title: "Bóveda Trump Coin: liquidez en uno de los mercados más activos.", sub: "Trump Coin mueve volumen las 24 horas. Suba o baje, la bóveda convierte esa actividad en intereses estimados en dólares, con retiro en cualquier momento.", theme: "trump" },
  { title: "Doble o Nada: mercados de predicción en tiempo real.", sub: "Rondas de 5 minutos, 15 minutos y 4 horas sobre Bitcoin, Ethereum y Solana. Se participa en dólares, sin comprar la moneda, y cada ronda se resuelve de forma automática y transparente.", theme: "doble" },
  { title: "Abre tu bóveda y olvídate de las gráficas.", sub: "Comprar y holdear cripto da ansiedad. En Bóveda la volatilidad te paga: cada subida y cada bajada deja intereses, y el Piloto Automático se encarga del resto.", theme: "calm" },
  { title: "Ya conoces Bitcoin. Ahora haz que te pague intereses.", sub: "Sin comprar monedas raras ni saber de cripto. Empiezas con dólares digitales y el sistema arma tu Bóveda Bitcoin en un toque.", theme: "bitcoin" },
];

/** Own address of each home version (same order as HERO_VARIANTS). */
export const HERO_SLUGS = ["clasica", "gta6", "trump", "doble-o-nada", "sin-ansiedad", "bitcoin"] as const;
export type HeroSlug = (typeof HERO_SLUGS)[number];
export const heroIndex = (slug: HeroSlug) => HERO_SLUGS.indexOf(slug);

/** Old campaign links (/?v=N): the address that replaces them, keeping other query params (e.g. ?ref=). Null when nothing to redirect. */
export function legacyHeroRedirect(searchStr: string): string | null {
  const q = new URLSearchParams(searchStr);
  const v = q.get("v");
  if (v === null) return null;
  q.delete("v");
  const slug = /^\d+$/.test(v) ? HERO_SLUGS[Number(v)] : undefined;
  const rest = q.toString();
  return `/${slug ?? ""}${rest ? `?${rest}` : ""}`;
}

/** Index of the GTA6 launch variant and the share of new visitors who see it. */
export const GTA6_HERO = HERO_VARIANTS.findIndex((v) => v.theme === "gta6");
export const GTA6_HEROES = HERO_VARIANTS.map((v, i) => (v.theme === "gta6" ? i : -1)).filter((i) => i >= 0);
export const GTA6_HERO_SHARE = 0.3;

export const HERO_KEY = "boveda-hero-v";

/** Share of new visitors per variant (same order as HERO_VARIANTS, sums to 1): GTA6 launch, then calm hold and Trump boosted. */
export const HERO_WEIGHTS: readonly number[] = HERO_VARIANTS.map((v) => ({ gta6: 0.3, calm: 0.25, trump: 0.25, doble: 0.1, bitcoin: 0 } as Record<string, number>)[v.theme ?? ""] ?? 0.1);

/** Pick a variant for "/": forced value wins, then the saved one (if still in rotation), else weighted random. */
export function pickHeroVariant(forced: string | null, saved: string | null, rand: number): number {
  const n = HERO_VARIANTS.length;
  const ok = (s: string | null) => s !== null && /^\d+$/.test(s) && Number(s) < n;
  if (ok(forced)) return Number(forced);
  if (ok(saved) && (HERO_WEIGHTS[Number(saved)] ?? 0) > 0) return Number(saved);
  let acc = 0;
  for (let i = 0; i < n; i++) { acc += HERO_WEIGHTS[i] ?? 0; if (rand < acc) return i; }
  return n - 1;
}

/** Preview host or a forced link: show the full landing (no returning-user shortcut) so variants can be reviewed. */
export function isHeroReview(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h.includes("id-preview") || h === "localhost" || new URLSearchParams(window.location.search).has("v");
}
