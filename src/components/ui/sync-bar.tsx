import { useT } from "@/lib/i18n";

/** Thin looping neon bar with a calm label, shown while vault earnings are still being read. */
export function SyncBar({ label = "Calculando en vivo…", className = "" }: { label?: string; className?: string }) {
  const t = useT();
  return <span role="status" aria-live="polite" className={`flex flex-col gap-1 ${className}`}>
    <span className="text-xs text-muted-foreground">{t(label)}</span>
    <span aria-hidden className="block h-1 w-full overflow-hidden rounded-full bg-muted"><span className="sync-sweep block h-full rounded-full" /></span>
  </span>;
}

/** Pill version for Mi Billetera's "Por reclamar" spot. */
export function SyncPill() {
  const t = useT();
  return <span role="status" aria-live="polite" className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
    ⚡ {t("Sincronizando ganancias…")}
    <span aria-hidden className="block h-1 w-12 overflow-hidden rounded-full bg-primary/15"><span className="sync-sweep block h-full rounded-full" /></span>
  </span>;
}
