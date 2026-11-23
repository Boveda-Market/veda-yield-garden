/**
 * User-facing coin names. Markets write some coins under long names that confuse people
 * (Coinbase's wrapped bitcoin shows up as CBBTC), so every screen shows the short name
 * people know. Keys are upper-case market symbols; add one whenever a new vault's market
 * name differs from the name shown to users.
 */
const COIN_LABELS: Record<string, string> = {
  CBBTC: "BTC",
  WBTC: "BTC",
  XBTC: "BTC",
};

/**
 * Short coin name for the screen. Never invents one: with no market name it returns the
 * fallback (the vault's own pair name), so a new vault always shows what its card shows.
 */
export function coinLabel(symbol: string | null | undefined, fallback = "") {
  const raw = (symbol ?? "").replace(/^\$/, "").trim();
  if (!raw) return fallback;
  return COIN_LABELS[raw.toUpperCase()] ?? raw;
}
