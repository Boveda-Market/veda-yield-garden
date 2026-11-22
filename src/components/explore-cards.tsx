import { Link } from "@tanstack/react-router";
import { ChevronRight, LayoutDashboard, PieChart, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";

/** Shown to new accounts with nothing in them: three doors to explore the whole app before depositing. */
export function ExploreCards() {
  const t = useT();
  const items = [
    { to: "/app" as const, icon: LayoutDashboard, title: t("Explorar bóvedas"), text: t("Rendimiento en vivo de $GTA6, $DCTY y $TRUMP.") },
    { to: "/mercados" as const, icon: Zap, title: t("Ver Doble o Nada"), text: t("Rondas de Bitcoin, Ethereum y SOL en tiempo real.") },
    { to: "/portfolio" as const, icon: PieChart, title: t("Conocer Mi Portafolio"), text: t("Así se ven tus intereses y gráficas al depositar.") },
  ];
  return <section aria-label={t("Explora la app")} className="rounded-2xl border border-border bg-card p-4">
    <h2 className="font-display text-lg font-semibold">{t("Explora la app sin depositar")}</h2>
    <p className="mt-0.5 text-xs text-muted-foreground">{t("Todo está abierto para mirar. Deposita solo cuando quieras.")}</p>
    <ul className="mt-3 space-y-2">{items.map(({ to, icon: Icon, title, text }) => <li key={to}>
      <Link to={to} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/50">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Icon size={18} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-muted-foreground">{text}</span></span>
        <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link></li>)}</ul>
  </section>;
}
