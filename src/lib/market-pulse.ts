/** Live market mood for a vault card, from the same DexScreener stats the card already reads. */
export type Pulse = "bull" | "moderate" | "volatile";

export function marketPulse(s: { buys24h: number | null; sells24h: number | null; change1h: number | null; change24h: number | null } | null | undefined): Pulse | null {
  if (!s || s.buys24h == null || s.sells24h == null || s.buys24h + s.sells24h === 0) return null;
  const buyShare = s.buys24h / (s.buys24h + s.sells24h);
  const c1 = s.change1h ?? 0, c24 = s.change24h ?? 0;
  if (Math.abs(c24) > 15 || c24 < -5 || buyShare < 0.45) return "volatile";
  if (buyShare > 0.6 && (c24 > 5 || c1 > 2)) return "bull";
  return "moderate";
}
