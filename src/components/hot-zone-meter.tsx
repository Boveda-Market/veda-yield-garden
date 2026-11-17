import { useT } from "@/lib/i18n";
import { hotZone } from "@/lib/hot-zone";
import type { ChainPosition } from "@/lib/solana-data";

/** Visual "zona caliente": shows at a glance where the price sits inside the position's earning range. */
export function HotZoneMeter({ position, className = "" }: { position: ChainPosition; className?: string }) {
  const t = useT();
  const zone = position.bins ? hotZone(position.bins) : null;
  if (!zone) return null;
  // Damped position: the marker reflects the live price but always floats inside the zone (20%–80%).
  const left = `${20 + (zone.pct / 100) * 60}%`;
  return <div className={`rounded-xl border border-border bg-muted/40 p-3 ${className}`} role="group" aria-label={t("Zona activa")}>
    <div className="flex items-start justify-between gap-2 text-xs"><span className="shrink-0 whitespace-nowrap font-bold uppercase tracking-wide">🔥 {t("Zona activa")}</span><span className="text-right font-semibold text-primary">✨ {t("Generando ganancias")}</span></div>
    <div className="relative mt-3 h-3">
      <div className="absolute inset-0 overflow-hidden rounded-full bg-[image:var(--gradient-hot)] opacity-90">
        <div className="zone-sweep absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-background/50 to-transparent motion-reduce:hidden" />
      </div>
      <div className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-background bg-foreground shadow-[0_0_10px_var(--primary)] transition-[left] duration-1000 ease-out" style={{ left }} aria-hidden="true" />
    </div>
    <div className="mt-1.5 text-center text-[10px] text-muted-foreground">● {t("Generando en tiempo real")}</div>
  </div>;
}
