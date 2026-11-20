export type Vault = {
  id: string;
  name: string;
  pair: string;
  pool: string;
  apy: number; // estimated annual %, illustrative
  risk: "Medio" | "Alto" | "Muy alto";
  blurb: string;
  /** Bold label shown instead of the plain risk chip (high-octane vaults). */
  badge?: string;
  /** Fine print shown under the blurb. */
  note?: string;
  /** Official token links (website, X, GMGN chart). */
  links?: { web: string; x: string; gmgn: string };
};

export const VAULTS: Vault[] = [
  { id: "sol", name: "Bóveda SOL", pair: "SOL/USDC", pool: "8Pm2kZpnxD3hoMmt4bjStX2Pw2Z9abpbHzZxMPqxPmie", apy: 18.4, risk: "Medio", blurb: "Gana intereses por intercambios entre SOL y USDC. Intereses constantes con riesgo medio." },
  { id: "gta6", name: "Bóveda GTA6", pair: "GTA6/USDC", pool: "99bL7ZdcQxcrkdJDKGoGpAhqZUMYEHzhMvtNadiZJpE8", apy: 0, risk: "Muy alto", badge: "⚡ Alto Octanaje · Rango Activo", blurb: "Intereses brutales impulsados por el volumen de GTA6. Tu dinero trabaja concentrado en la zona caliente de intercambio: mientras el precio esté en rango, cosechas a máxima velocidad. Si el mercado se mueve fuerte, el piloto automático rebalancea y reinvierte tus ganancias para mantenerte en la jugada.", note: "Moneda comunitaria de alta volatilidad sin vínculo con Rockstar Games.", links: { web: "https://stonkfun.xyz/token/4kjruqGHDsSqkMdFfCjV7Vb62HPFhtXyWc2t6JpQzDnz", x: "https://x.com/RockstarGames", gmgn: "https://gmgn.ai/sol/token/bvdapp_4kjruqGHDsSqkMdFfCjV7Vb62HPFhtXyWc2t6JpQzDnz" } },
  { id: "dcty", name: "Bóveda DCTY", pair: "DCTY/USDC", pool: "F7jNbQWivmiBDjzHDxQq32oWLW6cju4CdGyVw9RZV6tX", apy: 0, risk: "Muy alto", badge: "⚡ Alto Octanaje · Rango Activo", blurb: "Intereses brutales impulsados por el volumen de DacityCoin, la cripto que viste en GTA 6. Tu dinero trabaja concentrado en la zona caliente de intercambio: mientras el precio esté en rango, cosechas a máxima velocidad. Si el mercado se mueve fuerte, el piloto automático rebalancea y reinvierte tus ganancias para mantenerte en la jugada.", note: "Moneda comunitaria independiente de alta volatilidad, sin vínculo con Rockstar Games ni Take-Two Interactive.", links: { web: "https://dcty.xyz/", x: "https://x.com/DCTY_VI", gmgn: "https://gmgn.ai/sol/token/bvdapp_9hjBLBrc7WZW2H8UQvBAvG5WiTZotXUv2Bdcn4f4pump" } },
  { id: "trump", name: "Bóveda TRUMP", pair: "TRUMP/USDC", pool: "3C5YE97HADPDxZehYq9Cis8AXr9aNyrUsczKzE1nDbW9", apy: 0, risk: "Muy alto", badge: "⚡ Alto Octanaje · Rango Activo", blurb: "Intereses impulsados por el volumen de la moneda OFFICIAL TRUMP, una de las más negociadas del mercado. Tu dinero trabaja concentrado en la zona caliente de intercambio: mientras el precio esté en rango, cosechas a máxima velocidad. Si el mercado se mueve fuerte, el piloto automático rebalancea y reinvierte tus ganancias para mantenerte en la jugada.", note: "Moneda meme de alta volatilidad; su precio puede subir o bajar con fuerza en minutos.", links: { web: "https://gettrumpmemes.com/", x: "https://x.com/GetTrumpMemes", gmgn: "https://gmgn.ai/sol/token/bvdapp_6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN" } },
  { id: "met", name: "Bóveda MET", pair: "MET/USDC", pool: "BnztueWcXv93mgW7yJe8WYpnCxpz34nujPhfjQT6SLu1", apy: 34.2, risk: "Alto", blurb: "Más intereses por intereses con exposición a MET. Mayor volatilidad y riesgo alto." },
];

export type Position = { id: string; vaultId: string; principal: number; openedAt: number; claimed: number };

/** Accrued fees in USDC since opening, minus what was already harvested. */
export function accrued(p: Position, apy: number, now: number) {
  const years = Math.max(0, now - p.openedAt) / (365 * 24 * 3600 * 1000);
  return Math.max(0, p.principal * (apy / 100) * years - p.claimed);
}
