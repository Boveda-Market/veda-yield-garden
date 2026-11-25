import { Bot, DollarSign, ShieldCheck, Wallet } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VisitorBtcChart } from "@/components/visitor-btc-chart";
import trumpLogo from "@/assets/trump-logo.png";

const PILLARS = [
  { icon: DollarSign, label: "Entras solo con dólares" },
  { icon: Bot, label: "Piloto Automático 24/7" },
  { icon: Wallet, label: "Retiras cuando quieras" },
  { icon: ShieldCheck, label: "Tu dinero en tu billetera" },
] as const;

/** Bitcoin-first home version (/bitcoin) for people who only know Bitcoin, Dogecoin or Shiba: orange Bitcoin skin, live 7-day price. */
export function BitcoinHero({ title, sub }: { title: string; sub: string }) {
  const t = useT();
  return <div className="vault-btc overflow-hidden rounded-3xl bg-[image:var(--gradient-hot-surface)] text-hot-foreground shadow-[var(--shadow-hot)]">
    <div className="px-5 pb-5 pt-5 text-center sm:px-8 sm:pt-7 md:text-left">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-hot/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-hot">₿ {t("Bóveda Bitcoin")}</span>
      <h1 className="mt-3 font-display text-[1.75rem] font-bold leading-tight sm:text-4xl">{t(title)}</h1>
      <p className="mt-2 text-sm leading-6 text-hot-muted sm:text-base">{t(sub)}</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 text-left text-xs font-semibold sm:grid-cols-4">{PILLARS.map(({ icon: Icon, label }) => <li key={label} className="flex items-center gap-2 rounded-xl border border-hot/25 px-2.5 py-2"><Icon size={15} aria-hidden className="shrink-0 text-hot" /><span className="min-w-0 leading-tight">{t(label)}</span></li>)}</ul>
      <p className="mt-4 text-[11px] leading-4 text-hot-muted">{t("Intereses estimados que cambian cada día. El valor de tu bóveda sube y baja con el precio del Bitcoin.")}</p>
    </div>
  </div>;
}

const COMPARE = [
  { icon: "😴", title: "Guardarla quieta", body: "Compras y esperas. Solo ganas si el precio sube; si baja, solo te queda esperar." },
  { icon: "🎢", title: "Monedas de moda", body: "Dogecoin, Shiba o Safemoon pueden subir mucho y caer igual de rápido. Muchas personas perdieron dinero esperando." },
  { icon: "₿", title: "Bóveda Bitcoin", body: "Sigue el precio del Bitcoin y además cobra una comisión cada vez que otras personas compran o venden." },
] as const;

const HOW = [
  ["Alguien cambia dólares por Bitcoin", "Pasa miles de veces al día, suba o baje el precio."],
  ["Paga una comisión pequeña", "Como el cobro de una casa de cambio."],
  ["La comisión se reparte", "Va a las personas con dinero en la bóveda, como tú."],
] as const;

/** Extra blocks for the Bitcoin home version: hold vs. hype coins vs. vault, where the interest comes from, live price. */
export function BitcoinSections() {
  const t = useT();
  return <>
    <section aria-label={t("¿Compraste Dogecoin o Shiba y solo esperaste?")} className="mb-4 py-8">
      <h2 className="font-display text-2xl font-bold">{t("¿Compraste Dogecoin o Shiba y solo esperaste?")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("Hay otra forma de tener Bitcoin: que trabaje para ti mientras lo tienes.")}</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-3">{COMPARE.map((c, i) => <li key={c.title} className={`rounded-2xl border p-4 ${i === 2 ? "border-primary bg-primary/5" : "border-border bg-card"}`}><p className="text-2xl" aria-hidden>{c.icon}</p><h3 className="mt-2 font-display font-bold">{t(c.title)}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{t(c.body)}</p></li>)}</ul>
    </section>
    <section aria-label={t("¿De dónde salen los intereses?")} className="mb-4 py-8">
      <h2 className="font-display text-2xl font-bold">{t("¿De dónde salen los intereses?")}</h2>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">{HOW.map(([h, d], i) => <li key={h} className="rounded-2xl border border-border bg-card p-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">{i + 1}</span><h3 className="mt-3 font-display font-bold">{t(h)}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{t(d)}</p></li>)}</ol>
    </section>
    <section aria-label={t("Precio del Bitcoin en vivo")} className="mb-4 py-8">
      <h2 className="mb-4 font-display text-2xl font-bold">{t("Precio del Bitcoin en vivo")}</h2>
      <VisitorBtcChart />
    </section>
  </>;
}

const TRUMP_PILLARS = [
  { icon: DollarSign, label: "Entras solo con dólares" },
  { icon: Bot, label: "Piloto Automático 24/7" },
  { icon: Wallet, label: "Retiras cuando quieras" },
  { icon: ShieldCheck, label: "Tu dinero en tu billetera" },
] as const;

/** Trump Coin home version (/trump): same card layout as the Bitcoin hero, in the Trump vault skin. */
export function TrumpHero({ title, sub }: { title: string; sub: string }) {
  const t = useT();
  return <div className="vault-trump overflow-hidden rounded-3xl bg-[image:var(--gradient-hot-surface)] text-hot-foreground shadow-[var(--shadow-hot)]">
    <div className="px-5 pb-5 pt-5 text-center sm:px-8 sm:pt-7 md:text-left">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-hot/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-hot"><img src={trumpLogo} alt="" aria-hidden width={16} height={16} className="h-4 w-4 rounded-full" /> {t("Bóveda Trump Coin")}</span>
      <h1 className="mt-3 font-display text-[1.75rem] font-bold leading-tight sm:text-4xl">{t(title)}</h1>
      <p className="mt-2 text-sm leading-6 text-hot-muted sm:text-base">{t(sub)}</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 text-left text-xs font-semibold sm:grid-cols-4">{TRUMP_PILLARS.map(({ icon: Icon, label }) => <li key={label} className="flex items-center gap-2 rounded-xl border border-hot/25 px-2.5 py-2"><Icon size={15} aria-hidden className="shrink-0 text-hot" /><span className="min-w-0 leading-tight">{t(label)}</span></li>)}</ul>
      <p className="mt-4 text-[11px] leading-4 text-hot-muted">{t("Intereses estimados que cambian cada día. El valor de tu bóveda sube y baja con el precio de Trump Coin.")}</p>
    </div>
  </div>;
}

/** Classic home version (/clasica): same card layout as the Bitcoin hero, in the Meteora palette. */
export function ClassicHero({ title, sub }: { title: string; sub: string }) {
  const t = useT();
  return <div className="overflow-hidden rounded-3xl meteora-skin border border-[var(--mt-border)] text-[var(--mt-text)] shadow-sm">
    <div className="px-5 pb-5 pt-5 text-center sm:px-8 sm:pt-7 md:text-left">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mt-border)] bg-[var(--mt-bg)]/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--mt-accent)]">🏦 {t("Bóvedas")}</span>
      <h1 className="mt-3 font-display text-[1.75rem] font-bold leading-tight sm:text-4xl">{t(title)}</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--mt-muted)] sm:text-base">{t(sub)}</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 text-left text-xs font-semibold sm:grid-cols-4">{PILLARS.map(({ icon: Icon, label }) => <li key={label} className="flex items-center gap-2 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-bg)]/60 px-2.5 py-2"><Icon size={15} aria-hidden className="shrink-0 text-[var(--mt-accent)]" /><span className="min-w-0 leading-tight">{t(label)}</span></li>)}</ul>
      <p className="mt-4 text-[11px] leading-4 text-[var(--mt-muted)]">{t("Intereses estimados que cambian cada día. El valor de tu bóveda sube y baja con el precio de sus monedas.")}</p>
    </div>
  </div>;
}
