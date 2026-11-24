import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { useT } from "@/lib/i18n";

/** One tappable metric: label, big value, optional sub-line and the Spanish key of its plain-language explanation. */
export type MetricTile = { label: string; value: string; sub?: string | undefined; help?: string | undefined; accent?: boolean; wide?: boolean; change?: number | null | undefined };

/** Percent change vs. the previous 24 h, as Meteora shows it: ▲ 192% / ▼ 13%. */
export function ChangeLine({ change, className = "" }: { change: number | null | undefined; className?: string }) {
  const t = useT();
  if (change == null || !Number.isFinite(change)) return null;
  const abs = Math.abs(change);
  const p = `${abs.toLocaleString("en-US", { maximumFractionDigits: abs < 10 ? 1 : 0 })}%`;
  const up = change >= 0;
  return <span className={`block text-[10px] font-bold leading-tight tabular-nums ${up ? "text-primary" : "text-destructive"} ${className}`}>{up ? "▲" : "▼"} {t("{p} vs. ayer", { p })}</span>;
}

/** Two-column grid of metrics; tapping one with `help` opens a bottom sheet with «¿Qué significa?». */
export function MetricHelpGrid({ tiles }: { tiles: MetricTile[] }) {
  const t = useT();
  const [open, setOpen] = useState<MetricTile | null>(null);
  return <>
    <div className="grid grid-cols-2 gap-2">{tiles.map((m, i) => {
      const body = <>
        {m.help && <HelpCircle aria-hidden size={14} className="absolute right-2 top-2 text-muted-foreground/70" />}
        <span className="block text-[11px] leading-tight text-muted-foreground">{m.label}</span>
        <span className={`block truncate font-display text-lg font-bold tabular-nums ${m.accent ? "text-primary" : ""}`}>{m.value}</span>
        {m.sub && <span className="block text-[10px] leading-tight text-muted-foreground">{m.sub}</span>}
        <ChangeLine change={m.change} className="mt-0.5" />
      </>;
      const cls = `relative min-w-0 rounded-xl p-2.5 pr-6 text-left ${m.wide ? "col-span-2" : ""} ${m.accent ? "bg-primary/10" : "bg-muted"}`;
      return m.help
        ? <button type="button" key={`${m.label}-${i}`} onClick={() => setOpen(m)} aria-label={`${m.label}: ${m.value}. ${t("¿Qué significa?")}`} className={`${cls} transition-colors active:scale-[0.98] ${m.accent ? "hover:bg-primary/15" : "hover:bg-muted/70"}`}>{body}</button>
        : <div key={`${m.label}-${i}`} className={cls}>{body}</div>;
    })}</div>
    <Dialog open={open != null} onOpenChange={(o) => { if (!o) setOpen(null); }}><ActionSheetContent closeLabel={t("Cerrar")}>
      {open && <>
        <DialogTitle className="pr-10 font-display text-lg">{open.label}</DialogTitle>
        <div className="rounded-xl bg-muted p-3"><p className="font-display text-2xl font-bold tabular-nums">{open.value}</p>{open.sub && <p className="text-xs text-muted-foreground">{open.sub}</p>}<ChangeLine change={open.change} className="mt-1 text-xs" /></div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("¿Qué significa?")}</p>
        <DialogDescription className="text-base leading-7 text-foreground">{t(open.help ?? "")}</DialogDescription>
        {open.change != null && <p className="text-sm leading-6 text-muted-foreground">{t("El porcentaje en verde o rojo compara las últimas 24 horas con las 24 horas anteriores.")}</p>}
      </>}
    </ActionSheetContent></Dialog>
  </>;
}
