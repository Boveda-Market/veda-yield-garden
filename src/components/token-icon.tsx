import dctyLogo from "@/assets/dcty-logo.png";
import trumpLogo from "@/assets/trump-logo.png";
import gta6Logo from "@/assets/gta6-token.png.asset.json";

const LOGOS: Record<string, string> = {
  BTC: "/tokens/btc.svg", CBBTC: "/tokens/btc.svg", ETH: "/tokens/eth.svg", SOL: "/tokens/sol.svg", USDC: "/tokens/usdc.svg", USDT: "/tokens/usdt.svg",
  JUP: "/tokens/jup.png", JUPUSD: "/tokens/jupusd.png", BONK: "/tokens/bonk.jpg", WIF: "/tokens/wif.jpg", MET: "/tokens/met.svg",
  DCTY: dctyLogo, TRUMP: trumpLogo, GTA6: gta6Logo.url,
};

/** True when an official logo is bundled; without one the icon falls back to the symbol's letters, which would repeat the name next to it. */
export const hasTokenLogo = (symbol: string) => Boolean(LOGOS[symbol.toUpperCase()]);

/** Official coin logo, falling back to the symbol's initials when no logo is bundled. */
export function TokenIcon({ symbol, size = 24, className = "" }: { symbol: string; size?: number; className?: string }) {
  const src = LOGOS[symbol.toUpperCase()];
  const style = { width: size, height: size };
  if (!src) return <span style={style} className={`inline-grid shrink-0 place-items-center rounded-full bg-muted font-display text-[10px] font-bold ${className}`}>{symbol.slice(0, 4)}</span>;
  return <img src={src} alt={symbol} width={size} height={size} loading="lazy" style={style} className={`inline-block shrink-0 rounded-full object-contain ${className}`} />;
}
