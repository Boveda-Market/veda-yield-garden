import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button } from "./ui/button";
import { TokenIcon } from "./token-icon";

export type MiniPosition = { key: string; symbol: string; name: string; value: string; onDeposit?: () => void };

/** Compact summary of open positions shown above the vault catalog. */
export function OpenPositionsMini({ items, portfolioTo = "/portfolio" }: { items: MiniPosition[]; portfolioTo?: "/portfolio" | "/prueba" }) {
  const t = useT();
  if (items.length === 0) return null;
  return <section aria-label={t("Tus posiciones abiertas")} className="mt-8 rounded-lg border border-border bg-card p-4">
    <div className="flex items-center justify-between gap-2"><h2 className="font-display text-sm font-semibold">{t("Tus posiciones abiertas")} · {items.length}</h2><Link to={portfolioTo} className="text-xs font-medium text-primary">{t("Ver en portafolio")}</Link></div>
    <ul className="mt-3 divide-y divide-border">{items.map((i) => <li key={i.key} className="flex items-center gap-3 py-2">
      <TokenIcon symbol={i.symbol} size={24} />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t(i.name)}</p><p className="truncate text-xs text-muted-foreground">{i.value}</p></div>
      {i.onDeposit && <Button size="sm" variant="secondary" onClick={i.onDeposit}><Plus size={14} />{t("Depositar más")}</Button>}
    </li>)}</ul>
  </section>;
}
