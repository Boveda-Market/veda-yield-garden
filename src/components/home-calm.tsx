import { Bot, DollarSign, ShieldCheck, Target } from "lucide-react";
import { useT } from "@/lib/i18n";

/** Price path with its peaks and troughs: each turn drops a fee into the vault, so volatility reads as income, not fear. */
const PATH = "M0 52 C18 52 22 18 40 18 S62 62 80 62 S102 10 120 10 S142 56 160 56 S182 24 200 24 S222 48 240 48 S262 14 280 14 S300 40 320 40";
const TURNS: [number, number][] = [[40, 18], [80, 62], [120, 10], [160, 56], [200, 24], [240, 48], [280, 14]];

function VolatilityPays() {
  return <div aria-hidden className="relative h-28 w-full sm:h-32">
    <svg viewBox="0 0 320 72" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      <path d={PATH} fill="none" stroke="var(--mt-muted)" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
    {TURNS.map(([x, y], i) => <span key={x} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(x / 320) * 100}%`, top: `${(y / 72) * 100}%` }}>
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--mt-accent)] px-1 text-[10px] font-black text-[var(--mt-accent-fg)] shadow-[0_0_14px_-2px_var(--mt-accent)] motion-safe:animate-pulse" style={{ animationDelay: `${i * 0.35}s` }}>+$</span>
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
  return <div className="overflow-hidden rounded-3xl meteora-skin border border-[var(--mt-border)] text-[var(--mt-text)] shadow-sm">
    <div className="px-5 pt-5 sm:px-8 sm:pt-7">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mt-border)] bg-[var(--mt-bg)]/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--mt-accent)]">😌 {t("Holdea sin ansiedad")}</span><span className="rounded-full bg-[var(--mt-bg)]/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--mt-muted)]">{t("Sube · baja · te paga")}</span></div>
      <div className="mt-3"><VolatilityPays /></div>
    </div>
    <div className="px-5 pb-5 pt-4 text-center sm:px-8 md:text-left">
      <h1 className="font-display text-[1.7rem] font-bold leading-tight sm:text-4xl">{t(title)}</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--mt-muted)] sm:text-base">{t(sub)}</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 text-left text-xs font-semibold sm:grid-cols-4">{PILLARS.map(({ icon: Icon, label }) => <li key={label} className="flex items-center gap-2 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-bg)]/60 px-2.5 py-2"><Icon size={15} aria-hidden className="shrink-0 text-[var(--mt-accent)]" /><span className="min-w-0 leading-tight">{t(label)}</span></li>)}</ul>
      <p className="mt-4 font-display text-sm font-semibold leading-5">{t("El hold tradicional es esperar y rezar. Holdear en Bóveda es cobrar mientras duermes.")}</p>
      <p className="mt-2 text-[11px] leading-4 text-[var(--mt-muted)]">{t("Intereses estimados que cambian cada día. Las monedas digitales son volátiles y existe riesgo de pérdida.")}</p>
    </div>
  </div>;
}
