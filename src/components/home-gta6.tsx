import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Flame } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n";
import { poolYieldOptions } from "@/lib/pool-yield";
import { VAULTS } from "@/lib/vaults";
import { Sunset } from "./hot-vault-card";
import titleEs from "@/assets/gta6-vault-title.png";
import titleEn from "@/assets/gta6-vault-title-en.png";
import dobleLogo from "@/assets/doble-o-nada-logo.png";

const gta6 = VAULTS.find((v) => v.id === "gta6");

/** Live estimated APR label (fees 24h / TVL), never hardcoded; falls back to words when unavailable or low. */
export function useGta6AprLabel() {
  const t = useT();
  const y = useQuery({ ...poolYieldOptions(gta6?.pool ?? ""), enabled: !!gta6 });
  const apr = y.data?.apr;
  return apr != null && apr >= 100 ? `+${Math.round(apr).toLocaleString("en-US")}% APR` : t("Alto octanaje");
}

/** Full-width Vice-City hero for the GTA6 launch rotation. Original art only: no Rockstar logo or font. */
export function Gta6Hero({ title, sub }: { title: string; sub: string }) {
  const t = useT();
  const { lang } = useI18n();
  const apr = useGta6AprLabel();
  const steps = [["💵", "Depositas"], ["📲", "Te avisamos"], ["🎯", "Rebalanceas"]] as const;
  return <div className="hot-ring rounded-3xl p-[2px] shadow-[var(--shadow-hot)]">
    <div className="relative isolate overflow-hidden rounded-[calc(1.5rem-2px)] bg-[image:var(--gradient-hot-surface)] text-hot-foreground">
      <div className="relative bg-[image:var(--gradient-hot)] px-5 pb-4 pt-5 sm:px-8">
        <Sunset />
        <div className="relative flex flex-wrap items-center gap-2">
          <span className="hot-cta inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-hot-surface"><Flame size={12} aria-hidden />{t("Nueva")} · {apr}</span>
          <span className="rounded-full bg-hot-surface px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide">🎰 {t("Sé la casa")}</span>
        </div>
        <img src={lang === "en" ? titleEn : titleEs} alt={t("Bóveda GTA6")} width={lang === "en" ? 935 : 1074} height={lang === "en" ? 233 : 228} className="relative mt-3 h-12 w-auto max-w-full -rotate-2 sm:h-16" />
      </div>
      <div className="px-5 pb-5 pt-4 text-center sm:px-8 md:text-left">
        <h1 className="font-display text-[1.7rem] font-black leading-tight sm:text-4xl">{t(title)}</h1>
        <p className="mt-2 text-sm leading-6 text-hot-muted sm:text-base">{t(sub)}</p>
        <ol className="mt-4 grid grid-cols-3 gap-2 text-[11px] font-bold sm:text-xs">{steps.map(([i, l]) => <li key={l} className="flex flex-col items-center gap-1 rounded-xl bg-hot-surface/70 px-2 py-2"><span aria-hidden className="text-xl">{i}</span>{t(l)}</li>)}</ol>
        <Link to="/app" className="hot-cta mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-black text-hot-surface shadow-[var(--shadow-hot)] transition-transform active:scale-[0.98] md:max-w-sm">🎰 {t("Entrar a la Bóveda GTA6")}<ArrowRight size={18} /></Link>
        <p className="mt-3 text-[11px] leading-4 text-hot-muted">{t("APR estimado de las últimas 24 h, cambia cada día. Moneda muy volátil, sin vínculo con Rockstar Games.")}</p>
      </div>
    </div>
  </div>;
}

/** The two main home buttons, styled to pop in every hero variant. Vaults goes first in the GTA6 variant. */
export function HomeCtas({ vaultsFirst = false }: { vaultsFirst?: boolean }) {
  const t = useT();
  const apr = useGta6AprLabel();
  const { lang } = useI18n();
  const gtaTitle = lang === "en" ? titleEn : titleEs;
  const predict = <Link key="p" to="/mercados" className="group relative block min-w-0 rounded-2xl bg-primary p-[2px] shadow-[0_0_28px_-6px_var(--primary)] transition-transform active:scale-[0.98]">
    <span className="flex h-16 items-center justify-between gap-2 rounded-[14px] bg-[image:var(--gradient-hot-surface)] px-3 text-hot-foreground">
      <span className="flex min-w-0 items-center gap-2"><img src={dobleLogo} alt="" aria-hidden className="h-10 w-auto shrink-0 drop-shadow-[0_0_10px_var(--primary)] sm:h-11" /><span className="sr-only">{t("Ver Doble o Nada")}</span></span>
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-black uppercase tracking-wide"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground opacity-75 motion-reduce:animate-none" /><span className="relative inline-flex size-2 rounded-full bg-primary-foreground" /></span>{t("En vivo")}</span>
    </span>
  </Link>;
  const vaults = <Link key="v" to="/app" className="hot-ring group relative block min-w-0 rounded-2xl p-[2px] shadow-[var(--shadow-hot)] transition-transform active:scale-[0.98]">
    <span className="flex h-[4.5rem] items-center justify-between gap-2 rounded-[14px] bg-[image:var(--gradient-hot-surface)] px-3 text-hot-foreground">
      <span className="flex min-w-0 items-center gap-2 whitespace-nowrap font-display text-[15px] font-black sm:text-base"><img src={gtaTitle} alt="GTA6" className="h-7 w-auto shrink-0 -rotate-2 sm:h-9" /><span className="sr-only">{t("Explorar Bóvedas")}</span><ArrowRight size={16} className="hidden transition-transform group-hover:translate-x-0.5 min-[380px]:block" /></span>
      {apr.endsWith(" APR")
        ? <span className="hot-cta flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-1 leading-none text-hot-surface shadow-[0_0_18px_-2px_var(--hot)]">
            <span className="flex items-center gap-1 font-display text-2xl font-black tabular-nums tracking-tight sm:text-[1.7rem]"><Flame size={18} aria-hidden className="shrink-0" />{apr.replace(" APR", "")}</span>
            <span className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em]">APR</span>
          </span>
        : <span className="hot-cta flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 font-display text-sm font-black uppercase tracking-wide text-hot-surface"><Flame size={16} aria-hidden />{apr}</span>}
    </span>
  </Link>;
  return <div className="mb-4 grid w-full min-w-0 grid-cols-1 gap-2.5">{vaultsFirst ? [vaults, predict] : [predict, vaults]}</div>;
}
