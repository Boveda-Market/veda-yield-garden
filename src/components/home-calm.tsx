import { Link } from "@tanstack/react-router";
import { ArrowRight, Bot, DollarSign, ShieldCheck, Target } from "lucide-react";
import { useT } from "@/lib/i18n";

/** Price path with its peaks and troughs: each turn drops a fee into the vault, so volatility reads as income, not fear. */
const PATH = "M0 52 C18 52 22 18 40 18 S62 62 80 62 S102 10 120 10 S142 56 160 56 S182 24 200 24 S222 48 240 48 S262 14 280 14 S300 40 320 40";
const TURNS: [number, number][] = [[40, 18], [80, 62], [120, 10], [160, 56], [200, 24], [240, 48], [280, 14]];

function VolatilityPays() {
  return <div aria-hidden className="relative h-28 w-full sm:h-32">
    <svg viewBox="0 0 320 72" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      <path d={PATH} fill="none" stroke="var(--muted-foreground)" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
    {TURNS.map(([x, y], i) => <span key={x} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(x / 320) * 100}%`, top: `${(y / 72) * 100}%` }}>
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground shadow-[0_0_14px_-2px_var(--primary)] motion-safe:animate-pulse" style={{ animationDelay: `${i * 0.35}s` }}>+$</span>
    </span>)}
  </div>;
}

const PILLARS = [
  { icon: Target, label: "Curadas por el equipo" },
  { icon: DollarSign, label: "Entras solo con dólares" },
  { icon: Bot, label: "Piloto Automático 24/7" },
  { icon: ShieldCheck, label: "Autocustodia con Privy" },
] as const;

/** Calm "hold without anxiety" hero for the home rotation: the price line's every turn pays, and the four reasons not to worry. */
export function CalmHero({ title, sub }: { title: string; sub: string }) {
  const t = useT();
  return <div className="overflow-hidden rounded-3xl border border-primary/30 bg-[image:var(--gradient-hero)] shadow-sm">
    <div className="px-5 pt-5 sm:px-8 sm:pt-7">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">😌 {t("Holdea sin ansiedad")}</span><span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("Sube · baja · te paga")}</span></div>
      <div className="mt-3"><VolatilityPays /></div>
    </div>
    <div className="px-5 pb-5 pt-4 text-center sm:px-8 md:text-left">
      <h1 className="font-display text-[1.7rem] font-bold leading-tight sm:text-4xl">{t(title)}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{t(sub)}</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 text-left text-xs font-semibold sm:grid-cols-4">{PILLARS.map(({ icon: Icon, label }) => <li key={label} className="flex items-center gap-2 rounded-xl border border-border bg-card/80 px-2.5 py-2"><Icon size={15} aria-hidden className="shrink-0 text-primary" /><span className="min-w-0 leading-tight">{t(label)}</span></li>)}</ul>
      <Link to="/app" className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-[0_0_24px_-6px_var(--primary)] transition-transform active:scale-[0.98] md:max-w-sm">{t("Abrir mi bóveda")}<ArrowRight size={18} /></Link>
      <p className="mt-3 font-display text-sm font-semibold leading-5">{t("El hold tradicional es esperar y rezar. Holdear en Bóveda es cobrar mientras duermes.")}</p>
      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{t("Intereses estimados que cambian cada día. Las monedas digitales son volátiles y existe riesgo de pérdida.")}</p>
    </div>
  </div>;
}
