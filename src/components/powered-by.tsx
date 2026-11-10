const BRANDS = {
  polymarket: { src: "/brands/polymarket.svg", name: "Polymarket", wide: true },
  meteora: { src: "/brands/meteora.svg", name: "Meteora", wide: false },
} as const;

/** Small "Powered by" attribution with the provider's official logo. */
export function PoweredBy({ brand, className = "" }: { brand: keyof typeof BRANDS; className?: string }) {
  const b = BRANDS[brand];
  return (
    <p className={`flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground ${className}`}>
      <span>Powered by</span>
      {b.wide
        ? <img src={b.src} alt={b.name} className="h-3 w-auto rounded-sm bg-foreground/90 px-1 py-0.5 dark:bg-transparent" loading="lazy" />
        : <><img src={b.src} alt="" className="h-3.5 w-3.5 rounded-full" loading="lazy" /><span className="font-semibold text-foreground">{b.name}</span></>}
    </p>
  );
}
