import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Bot, CircleDollarSign, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/lib/i18n";
import { compoundExample } from "@/lib/compound-example";

const CAPITALS = [100, 500, 1000, 2500, 5000];

export function CompoundHero({ title, sub }: { title: string; sub: string }) {
  const { t } = useI18n();
  return <div className="border-b border-border pb-5 text-center md:text-left">
    <p className="flex items-center justify-center gap-2 text-xs font-bold text-primary md:justify-start"><Repeat2 size={16} aria-hidden />{t("Bóveda Market · Interés compuesto")}</p>
    <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight sm:text-5xl">{t(title)}</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{t(sub)}</p>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("Reinvertir puede aumentar los intereses futuros. No garantiza ganancias ni evita pérdidas.")}</p>
  </div>;
}

export function CompoundSimulator() {
  const { t, lang } = useI18n();
  const [capitalIndex, setCapitalIndex] = useState(1);
  const [months, setMonths] = useState(12);
  const [rate, setRate] = useState(2);
  const capital = CAPITALS[capitalIndex] ?? 500;
  const result = compoundExample(capital, rate, months);
  const money = (value: number) => new Intl.NumberFormat(lang === "en" ? "en-US" : "es-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
  const min = capital * 0.98;
  const max = Math.max(result.compound, capital * 1.1);
  const y = (value: number) => 155 - (value - min) / (max - min) * 132;
  const path = (kind: "simple" | "compound") => result.points.map((point, index) => `${index === 0 ? "M" : "L"}${18 + point.month / months * 364},${y(point[kind])}`).join(" ");
  return <section aria-label={t("Simulador de interés compuesto")} className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-display text-lg font-bold">{t("El efecto bola de nieve")}</h2>
      <span className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Ejemplo hipotético")}</span>
    </div>
    <div className="mt-4 flex items-end justify-between gap-3"><label id="compound-capital-label" className="text-xs text-muted-foreground">{t("Capital inicial")}</label><output className="font-display text-2xl font-bold tabular-nums">{money(capital)}</output></div>
    <Slider className="mt-1 h-11" aria-labelledby="compound-capital-label" min={0} max={4} step={1} value={[capitalIndex]} onValueChange={(values) => setCapitalIndex(values[0] ?? 1)} aria-valuetext={money(capital)} />
    <div className="flex justify-between text-[10px] text-muted-foreground"><span>$100</span><span>$5,000</span></div>
    <div className="mt-3 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{t("Tiempo")}</span><div role="group" aria-label={t("Tiempo")} className="flex gap-1">{[3, 6, 12].map((n) => <Button key={n} variant={months === n ? "secondary" : "ghost"} aria-pressed={months === n} className="h-11 px-2 text-xs" onClick={() => setMonths(n)}>{t("{n} meses", { n })}</Button>)}</div></div>
    <div className="mt-2 flex justify-between gap-3"><label id="compound-rate-label" className="text-xs text-muted-foreground">{t("Interés mensual supuesto")}</label><output className="text-sm font-bold tabular-nums">{rate}%</output></div>
    <Slider className="h-11" aria-labelledby="compound-rate-label" min={0} max={5} step={0.5} value={[rate]} onValueChange={(values) => setRate(values[0] ?? 2)} />
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]"><span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-primary" />{t("Reinvirtiendo")}</span><span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-0.5 w-4 bg-muted-foreground" />{t("Sin reinvertir")}</span></div>
    <svg viewBox="0 0 400 180" role="img" aria-label={t("Comparación hipotética con y sin reinversión")} className="mt-1 w-full overflow-visible">
      {[35, 95, 155].map((line) => <line key={line} x1="18" x2="382" y1={line} y2={line} className="stroke-border" strokeDasharray="3 5" />)}
      <path d={path("simple")} fill="none" className="stroke-muted-foreground" strokeWidth="2" strokeDasharray="5 4" />
      <path d={path("compound")} fill="none" className="stroke-primary" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="382" cy={y(result.compound)} r="4" className="fill-primary" />
      <text x="18" y="177" className="fill-muted-foreground text-[10px]">{t("Hoy")}</text><text x="382" y="177" textAnchor="end" className="fill-muted-foreground text-[10px]">{t("{n} meses", { n: months })}</text>
    </svg>
    <div aria-live="polite" aria-atomic="true">
      <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3">
        <div><dt className="text-xs text-primary">{t("Reinvirtiendo")}</dt><dd data-testid="compound-total" className="mt-1 font-display text-xl font-bold tabular-nums">{money(result.compound)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">{t("Sin reinvertir")}</dt><dd data-testid="simple-total" className="mt-1 font-display text-xl font-bold tabular-nums">{money(result.simple)}</dd></div>
      </dl>
      <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-primary"><Repeat2 size={14} aria-hidden />{t("Diferencia por reinvertir:")} <span data-testid="compound-extra">{money(result.extra)}</span></p>
    </div>
    <p className="mt-3 text-[11px] leading-5 text-muted-foreground">{t("Modelo educativo con tasa constante y reinversión mensual. No es una tasa de Bóveda Market ni una proyección. Incluye los intereses apartados en el total sin reinvertir; excluye costos y cambios de precio. Puedes perder capital.")}</p>
  </section>;
}

const RULES = [
  { icon: ArrowUpRight, title: "Si sale por arriba: reinvierte", body: "El Piloto Automático suma las ganancias netas a la misma bóveda inteligente. Esos intereses también pueden generar nuevos intereses." },
  { icon: ArrowDownRight, title: "Si sale por abajo: deja dólares disponibles", body: "Las ganancias cosechadas se convierten a dólares disponibles en tu billetera, sin reinvertirlas en esa bajada. El capital de la bóveda sigue expuesto al mercado." },
  { icon: CircleDollarSign, title: "Dentro del rango: acumula intereses", body: "Las compras y ventas pueden generar intereses mientras tu posición está activa. El Piloto no reinvierte por cada movimiento del precio." },
];

export function CompoundSections() {
  const { t } = useI18n();
  return <>
    <section className="border-t border-border py-8">
      <p className="flex items-center gap-2 text-xs font-bold text-primary"><Bot size={16} aria-hidden />{t("Piloto Automático")}</p>
      <h2 className="mt-2 font-display text-2xl font-bold">{t("El mercado se mueve. Tu estrategia también.")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("El interés nace de los intercambios, no de acertar la dirección del precio. Reinvertirlo puede ampliar tu base con el tiempo.")}</p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-3">{RULES.map(({ icon: Icon, title, body }) => <li key={title} className="rounded-lg border border-border bg-card p-4"><Icon size={22} className="text-primary" aria-hidden /><h3 className="mt-3 font-display text-sm font-bold">{t(title)}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{t(body)}</p></li>)}</ul>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("Actúa tras 5 minutos fuera del rango y solo si se cumplen sus controles. La reinversión real depende del mercado, no de un calendario mensual.")}</p>
    </section>
    <section className="border-t border-border py-8">
      <h2 className="font-display text-2xl font-bold">{t("Menos vigilancia. Más constancia.")}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="border-l-2 border-border pl-4"><h3 className="font-display font-bold">{t("Reinvertir a mano")}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("Vigilar el precio, recoger intereses y decidir cuándo volver a sumarlos. Una tarea que se repite cada vez que la bóveda necesita ajustarse.")}</p></div>
        <div className="border-l-2 border-primary pl-4"><h3 className="font-display font-bold text-primary">{t("Con el Piloto Automático")}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("El sistema mantiene tu bóveda inteligente activa, aplica la regla de reinversión y te informa de los movimientos. Tú sigues el resultado en Mi Portafolio.")}</p></div>
      </div>
    </section>
  </>;
}