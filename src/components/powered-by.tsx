import { ExternalLink } from "lucide-react";

const BRANDS = {
  polymarket: { src: "/brands/polymarket-mark.svg", name: "Polymarket", wide: false, square: false },
  coinbase: { src: "/brands/coinbase.svg", name: "Coinbase", wide: false, square: false },
  meteora: { src: "/brands/meteora.svg", name: "Meteora", wide: false, square: false, site: "https://meteora.ag" },
  privy: { src: "/brands/privy-mark.png", name: "Privy", wide: false, square: true, site: "https://www.privy.io/" },
  jupiter: { src: "/brands/jupiter.svg", name: "Jupiter", wide: false, square: true, site: "https://jup.ag" },
} as const;

/** Small provider attribution with the official logo. Plain text by default; `asLink` turns it into a link to the provider's site. */
export function PoweredBy({ brand, className = "", asLink = false, label = "Powered by" }: { brand: keyof typeof BRANDS; className?: string; asLink?: boolean; label?: string }) {
  const b = BRANDS[brand];
  const cls = `flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground ${className}`;
  const inner = (
    <>
      <span>{label}</span>
      {b.wide
        ? <img src={b.src} alt={b.name} className="h-3 w-auto rounded-sm bg-foreground/90 px-1 py-0.5 dark:bg-transparent" loading="lazy" />
        : <><img src={b.src} alt="" className={`h-4 w-4${b.square ? "" : " rounded-full"}`} loading="lazy" /><span className="font-semibold text-foreground">{b.name}</span></>}
      {asLink && "site" in b && b.site && <ExternalLink size={11} aria-hidden className="shrink-0 opacity-70" />}
    </>
  );
  if (asLink && "site" in b && b.site) {
    return (
      <a
        href={b.site}
        target="_blank"
        rel="noopener noreferrer"
        className={`${cls} underline-offset-2 transition-colors hover:text-foreground hover:underline`}
      >
        {inner}
      </a>
    );
  }
  return <p className={cls}>{inner}</p>;
}
