import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { useT } from "@/lib/i18n";

/** One tappable metric: label, big value, optional sub-line and the Spanish key of its plain-language explanation. */
export type MetricTile = { label: string; value: string; sub?: string | undefined; help?: string | undefined; accent?: boolean; wide?: boolean };

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
      </>;
      const cls = `relative min-w-0 rounded-xl p-2.5 pr-6 text-left ${m.wide ? "col-span-2" : ""} ${m.accent ? "bg-primary/10" : "bg-muted"}`;
      return m.help
        ? <button type="button" key={`${m.label}-${i}`} onClick={() => setOpen(m)} aria-label={`${m.label}: ${m.value}. ${t("¿Qué significa?")}`} className={`${cls} transition-colors active:scale-[0.98] ${m.accent ? "hover:bg-primary/15" : "hover:bg-muted/70"}`}>{body}</button>
        : <div key={`${m.label}-${i}`} className={cls}>{body}</div>;
    })}</div>
    <Dialog open={open != null} onOpenChange={(o) => { if (!o) setOpen(null); }}><ActionSheetContent closeLabel={t("Cerrar")}>
      {open && <>
        <DialogTitle className="pr-10 font-display text-lg">{open.label}</DialogTitle>
        <div className="rounded-xl bg-muted p-3"><p className="font-display text-2xl font-bold tabular-nums">{open.value}</p>{open.sub && <p className="text-xs text-muted-foreground">{open.sub}</p>}</div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("¿Qué significa?")}</p>
        <DialogDescription className="text-base leading-7 text-foreground">{t(open.help ?? "")}</DialogDescription>
      </>}
    </ActionSheetContent></Dialog>
  </>;
}
