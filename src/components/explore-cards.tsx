import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calculator, ChevronDown, ChevronRight, LayoutDashboard, PieChart, Zap } from "lucide-react";
import { EarningsSimulator } from "@/components/earnings-simulator";
import { useT } from "@/lib/i18n";

/** Shown to accounts with nothing in them: doors to explore the whole app plus an earnings simulator, before depositing. */
export function ExploreCards({ onPortfolio = false }: { onPortfolio?: boolean }) {
  const t = useT();
  const [simOpen, setSimOpen] = useState(false);
  const items = [
    { to: "/app" as const, icon: LayoutDashboard, title: t("Explorar bóvedas"), text: t("Rendimiento en vivo de $GTA6, $DCTY y $TRUMP.") },
    { to: "/mercados" as const, icon: Zap, title: t("Ver Doble o Nada"), text: t("Rondas de Bitcoin, Ethereum y SOL en tiempo real.") },
    ...(onPortfolio ? [] : [{ to: "/portfolio" as const, icon: PieChart, title: t("Conocer Mi Portafolio"), text: t("Así se ven tus intereses y gráficas al depositar.") }]),
  ];
  const row = "flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/50";
  const icon = "grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary";
  return <section aria-label={t("Explora la app")} className="rounded-2xl border border-border bg-card p-4">
    <h2 className="font-display text-lg font-semibold">{t("Explora la app sin depositar")}</h2>
    <p className="mt-0.5 text-xs text-muted-foreground">{t("Todo está abierto para mirar. Deposita solo cuando quieras.")}</p>
    <ul className="mt-3 space-y-2">
      <li><details open={simOpen} onToggle={(e) => setSimOpen(e.currentTarget.open)} className="rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/50 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-3">
          <span className={icon}><Calculator size={18} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t("Simular ganancias")}</span><span className="block text-xs text-muted-foreground">{t("Calcula cuánto generaría un depósito hoy.")}</span></span>
          <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${simOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </summary>
        {simOpen && <EarningsSimulator />}
      </details></li>
      {items.map(({ to, icon: Icon, title, text }) => <li key={to}>
        <Link to={to} className={row}>
          <span className={icon}><Icon size={18} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-muted-foreground">{text}</span></span>
          <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link></li>)}
    </ul>
  </section>;
}
