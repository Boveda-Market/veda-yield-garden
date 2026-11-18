/** Official BÓVEDA MARKET lockup: real icon + wordmark + shimmering neon MARKET seal + live 24/7 line. */
export function BrandLogo({ size = "md", live = true }: { size?: "sm" | "md" | "lg"; live?: boolean }) {
  const icon = size === "lg" ? "h-16 w-16 rounded-2xl" : size === "sm" ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl";
  const word = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return <span className={`inline-flex items-center gap-2.5 ${size === "lg" ? "flex-col" : ""}`}>
    <img src="/icon-512.png" alt="" className={`${icon} shrink-0 shadow-[0_0_12px_color-mix(in_oklab,var(--color-primary)_35%,transparent)] ring-1 ring-primary/40`} />
    <span className={`flex flex-col leading-none ${size === "lg" ? "items-center" : ""}`}>
      <span className="flex items-center gap-1.5">
        <span className={`font-display font-bold tracking-wide ${word}`}>BÓVEDA</span>
        <span className="brand-seal relative -rotate-2 overflow-hidden rounded-md border border-primary bg-foreground px-1.5 py-0.5 text-[10px] font-black italic tracking-widest text-primary dark:bg-background">MARKET</span>
      </span>
      {live && <span className="mt-1 flex items-center gap-1 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" /></span>LIVE · 24/7
      </span>}
    </span>
  </span>;
}
