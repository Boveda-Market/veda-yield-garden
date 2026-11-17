import { useT } from "@/lib/i18n";
import { hotZone } from "@/lib/hot-zone";
import type { ChainPosition } from "@/lib/solana-data";

/** Visual "zona caliente": shows at a glance where the price sits inside the position's earning range. */
export function HotZoneMeter({ position, className = "" }: { position: ChainPosition; className?: string }) {
  const t = useT();
  const zone = position.bins ? hotZone(position.bins) : null;
  if (!zone) return null;
  const msg = zone.status === "center" ? "" : zone.status === "edge" ? t("Sistema listo para rebalancear") : t("Sistema listo para rebalancear · también lo hace en automático");
  const tone = zone.status === "center" ? "text-primary" : "text-primary";
  const icon = zone.status === "center" ? "" : "🔄 ";
  // Out of range: park the marker just past the edge it crossed.
  const left = zone.status === "out" ? `calc(${zone.pct}% ${zone.side === "high" ? "+" : "-"} 6px)` : `${zone.pct}%`;
  return <div className={`rounded-xl border border-border bg-muted/40 p-3 ${className}`} role="group" aria-label={t("Zona caliente")}>
    <div className="flex items-start justify-between gap-2 text-xs"><span className="shrink-0 whitespace-nowrap font-bold uppercase tracking-wide">🔥 {t("Zona caliente")}</span><span className={`text-right font-semibold ${tone}`}>{icon}{msg}</span></div>
    <div className="relative mt-3 h-3">
      <div className="absolute inset-0 overflow-hidden rounded-full bg-[image:var(--gradient-hot)] opacity-90">
        <div className="absolute inset-y-0 left-0 w-[15%] bg-background/55" /><div className="absolute inset-y-0 right-0 w-[15%] bg-background/55" />
      </div>
      <div className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-background bg-foreground shadow-md transition-[left] duration-700" style={{ left }} aria-hidden="true">
        {zone.status !== "center" && <span className="absolute inset-0 animate-ping rounded-full bg-primary/60 motion-reduce:animate-none" />}
      </div>
    </div>
    <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground"><span>{t("Borde")}</span><span>● {t("Precio actual")}</span><span>{t("Borde")}</span></div>
  </div>;
}
