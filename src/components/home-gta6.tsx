import { LightningBadge } from "@/components/lightning-badge";
import type React from "react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Flame, TrendingDown, TrendingUp } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n";
import { poolYieldOptions } from "@/lib/pool-yield";
import { VAULTS } from "@/lib/vaults";
import { Sunset } from "./hot-vault-card";
import titleEs from "@/assets/gta6-vault-title.png";
import titleEn from "@/assets/gta6-vault-title-en.png";
import dobleLogo from "@/assets/doble-o-nada-logo.png";
import trumpLogo from "@/assets/trump-logo.png";

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
  const steps = [["💵", "Depósito"], ["📲", "Alertas"], ["🤖", "Piloto Automático"]] as const;
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
export function HomeCtas({ vaultsFirst = false, trump = false }: { vaultsFirst?: boolean; trump?: boolean }) {
  const t = useT();
  const gtaApr = useGta6AprLabel();
  const trumpVault = VAULTS.find((v) => v.id === "trump");
  const ty = useQuery({ ...poolYieldOptions(trumpVault?.pool ?? ""), enabled: trump && !!trumpVault });
  const tApr = ty.data?.apr;
  const apr = trump ? (tApr != null && tApr > 0 ? `+${Math.round(tApr).toLocaleString("en-US")}% APR` : t("Alto octanaje")) : gtaApr;
  const { lang } = useI18n();
  const gtaTitle = lang === "en" ? titleEn : titleEs;
  const predict = <Link key="p" to="/mercados" className="group relative block min-w-0 rounded-2xl bg-primary p-[2px] shadow-[0_0_28px_-6px_var(--primary)] transition-transform active:scale-[0.98]">
    <span className="relative isolate flex h-16 items-center justify-between gap-2 overflow-hidden rounded-[14px] bg-[image:var(--gradient-hot-surface)] px-3 text-hot-foreground">
      <DuelLines />
      <span className="flex min-w-0 flex-col items-start gap-0.5"><img src={dobleLogo} alt="" aria-hidden className="h-8 w-auto shrink-0 drop-shadow-[0_0_10px_var(--primary)] sm:h-9" /><LightningBadge /><span className="sr-only">{t("Ver Doble o Nada")}</span></span>
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-black uppercase tracking-wide"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground opacity-75 motion-reduce:animate-none" /><span className="relative inline-flex size-2 rounded-full bg-primary-foreground" /></span>{t("En vivo")}</span>
    </span>
  </Link>;
  const vaults = <Link key="v" to="/app" className={`${trump ? "vault-trump " : ""}hot-ring group relative block min-w-0 rounded-2xl p-[2px] shadow-[var(--shadow-hot)] transition-transform active:scale-[0.98]`}>
    <span className="relative isolate flex h-[4.5rem] items-center justify-between gap-2 overflow-hidden rounded-[14px] bg-[image:var(--gradient-hot-surface)] px-3 text-hot-foreground">
      <span aria-hidden className="cta-shimmer pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-gradient-to-r from-transparent via-hot-foreground/30 to-transparent" />
      <span className="flex min-w-0 items-center gap-2 whitespace-nowrap font-display text-[15px] font-black sm:text-base">{trump ? <span className="flex items-center gap-2"><img src={trumpLogo} alt="" aria-hidden width={160} height={160} className="h-9 w-9 shrink-0 rounded-full ring-2 sm:h-10 sm:w-10 ring-hot-2 drop-shadow-[0_0_10px_var(--hot-2)]" /><span className="flex flex-col items-start leading-none"><span className="flex items-center gap-1.5"><span className="text-[10px] font-bold uppercase tracking-[0.25em] text-hot-muted">{lang === "en" ? "Vault" : "Bóveda"}</span><span className="rounded-sm bg-[color:var(--trump-blue)] px-1 py-px text-[8px] font-bold tracking-[0.2em] text-[color:var(--trump-gold)] ring-1 ring-[color:var(--trump-gold)]/60">{lang === "en" ? "OFFICIAL" : "OFICIAL"}</span></span><span className="trump-gold -rotate-2 font-display text-[1.05rem] font-black italic uppercase tracking-tight whitespace-nowrap min-[380px]:text-[1.2rem] sm:text-2xl">TRUMP COIN</span></span></span> : <img src={gtaTitle} alt="GTA6" className="h-7 w-auto shrink-0 -rotate-2 sm:h-9" />}<span className="sr-only">{t("Explorar Bóvedas")}</span><ArrowRight size={16} className="hidden transition-transform group-hover:translate-x-0.5 min-[380px]:block" /></span>
      {apr.endsWith(" APR")
        ? <span className="hot-cta flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-1 leading-none text-hot-surface shadow-[0_0_18px_-2px_var(--hot)]">
            <span className="flex items-center gap-1 font-display text-2xl font-black tabular-nums tracking-tight sm:text-[1.7rem]"><Flame size={18} aria-hidden className="flame-flicker shrink-0" />{apr.replace(" APR", "")}</span>
            <span className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em]">APR</span>
          </span>
        : trump
          ? <span className="relative flex h-[3.4rem] w-[5.6rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-[color:var(--trump-blue)] text-center leading-none ring-1 ring-[color:var(--trump-gold)] shadow-[0_0_16px_-4px_var(--trump-gold)] sm:w-28">
              <span aria-hidden className="text-[8px] tracking-[0.3em] text-[color:var(--trump-gold)]">★ ★ ★</span>
              <span className="trump-gold font-display text-[13px] font-black uppercase italic tracking-wide sm:text-sm">{lang === "en" ? "High" : "Alto"}</span>
              <span className="font-display text-[9px] font-bold uppercase tracking-[0.25em] text-[color:var(--trump-gold)]">{lang === "en" ? "Octane" : "Octanaje"}</span>
            </span>
          : <span className="hot-cta flex w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-xl px-1.5 py-1 text-center font-display text-[10px] font-black uppercase leading-tight tracking-wide text-hot-surface"><Flame size={16} aria-hidden className="flame-flicker" />{apr}</span>}
    </span>
  </Link>;
  return <div className="mb-4 grid w-full min-w-0 grid-cols-1 gap-2.5">{vaultsFirst ? [vaults, predict] : [predict, vaults]}</div>;
}

/** Decorative Sube/Baja duel: green and red lines keep crossing a dashed target line, looping behind the logo. */
export function DuelLines() {
  const up = "M0 34 C25 14 50 14 75 30 S125 50 150 26 S200 8 225 28 S275 46 300 34";
  const down = "M0 30 C25 48 50 46 75 32 S125 12 150 34 S200 52 225 32 S275 16 300 30";
  return <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-60">
    <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-hot-foreground/40" />
    <svg viewBox="0 0 300 64" preserveAspectRatio="none" className="duel-scroll absolute inset-y-0 left-0 h-full w-[200%]">
      {[0, 300].map((x) => <g key={x} transform={`translate(${x / 2} 0) scale(0.5 1)`}>
        <path d={up} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={down} fill="none" stroke="var(--destructive)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>)}
    </svg>
  </span>;
}

/** Shared GTA6 tile body for Mi Billetera: Sunset, GTA-style title, shimmer and a big live APR badge, identical with or without a position. */
export function Gta6TileBody({ status }: { status?: React.ReactNode }) {
  const t = useT();
  const apr = useGta6AprLabel();
  const { lang } = useI18n();
  const num = apr.endsWith(" APR") ? apr.replace(" APR", "") : null;
  return <span className="relative isolate flex h-full flex-col gap-1.5 overflow-hidden rounded-[14px] bg-[image:var(--gradient-hot-surface)] p-3 text-hot-foreground">
    <span aria-hidden className="cta-shimmer pointer-events-none absolute inset-y-0 left-0 z-10 w-1/3 bg-gradient-to-r from-transparent via-hot-foreground/30 to-transparent" />
    <img src={lang === "en" ? titleEn : titleEs} alt={t("Bóveda GTA6")} className="h-7 w-auto max-w-full self-start -rotate-2 drop-shadow-[0_0_10px_var(--hot)]" />
    <span className="hot-cta flex w-fit items-end gap-1 rounded-xl px-2.5 py-1 leading-none text-hot-surface shadow-[0_0_18px_-2px_var(--hot)]">
      <Flame size={18} aria-hidden className="flame-flicker mb-0.5 shrink-0" />
      {num ? <><span className="font-display text-2xl font-black tabular-nums tracking-tight">{num}</span><span className="mb-0.5 text-[10px] font-black uppercase tracking-widest">APR</span></> : <span className="font-display text-sm font-black uppercase">{apr}</span>}
    </span>
    {status}
  </span>;
}

const BANNER_KEY = "boveda:gta6-banner";

/** Wide GTA6 banner for Mi Billetera: three styles (poster, neon billboard, mini promo) rotate every 7 s, starting on a different one each visit. */
export function Gta6RotatingBanner({ cta, sub, index, dots = true }: { cta: React.ReactNode; sub?: React.ReactNode; index?: number; dots?: boolean }) {
  const t = useT();
  const apr = useGta6AprLabel();
  const { lang } = useI18n();
  const [own, setI] = useState(0);
  const i = index ?? own;
  const controlled = index !== undefined;
  useEffect(() => {
    if (controlled) return;
    let start = 0;
    try { start = (Number(sessionStorage.getItem(BANNER_KEY) ?? localStorage.getItem(BANNER_KEY) ?? -1) + 1) % 3; if (!sessionStorage.getItem(BANNER_KEY)) { localStorage.setItem(BANNER_KEY, String(start)); sessionStorage.setItem(BANNER_KEY, String(start)); } else start = Number(sessionStorage.getItem(BANNER_KEY)) % 3; } catch { /* storage blocked */ }
    setI(start);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((v) => (v + 1) % 3), 7000);
    return () => clearInterval(id);
  }, [controlled]);
  const title = <img src={lang === "en" ? titleEn : titleEs} alt={t("Bóveda GTA6")} className="h-7 w-auto max-w-[70%] -rotate-2 drop-shadow-[0_0_12px_var(--hot)]" />;
  const aprNum = apr.endsWith(" APR") ? apr.replace(" APR", "") : apr;
  const slides = [
    <span key="a" className="flex h-full flex-col bg-[image:var(--gradient-hot)]">
      <span className="relative block flex-1 px-3.5 py-2"><Sunset />
        <span className="relative flex flex-col gap-1"><span className="w-fit rounded-full bg-hot-surface/80 px-2 py-0.5 text-[10px] font-black uppercase">🎰 {t("Sé la casa")} · ● {t("En vivo")}</span>{title}</span>
        <span className="hot-cta absolute bottom-2 right-3.5 flex items-end gap-1 rounded-xl px-2.5 py-1 leading-none text-hot-surface"><Flame size={18} aria-hidden className="flame-flicker" /><span className="font-display text-2xl font-black tabular-nums">{aprNum}</span>{apr.endsWith(" APR") && <span className="text-[10px] font-black">APR</span>}</span>
      </span>
      <span className="flex items-center justify-between gap-2 bg-hot-surface px-3.5 py-2 text-sm font-extrabold">{cta}</span>
    </span>,
    <span key="b" className="flex h-full flex-col justify-between gap-2 bg-[image:var(--gradient-hot-surface)] px-3.5 py-2.5">
      <span className="flex items-center justify-between gap-3"><span className="flex min-w-0 flex-col gap-1.5">{title}{sub && <span className="text-[11px] font-bold text-hot-muted">{sub}</span>}</span><span className="text-right"><span className="block font-display text-2xl font-black tabular-nums text-hot drop-shadow-[0_0_12px_var(--hot)]">{aprNum}</span>{apr.endsWith(" APR") && <span className="text-[9px] font-black uppercase text-hot-muted">APR 24h</span>}</span></span>
      <span className="flex items-center justify-center gap-2 rounded-xl border-2 border-hot bg-hot-surface px-3 py-1.5 text-sm font-extrabold shadow-[0_0_18px_-4px_var(--hot)]">{cta}</span>
    </span>,
    <span key="c" className="flex h-full flex-col bg-hot-surface">
      <span className="relative block h-16 bg-[image:var(--gradient-hot)] px-3.5 py-2.5"><Sunset /><span className="relative">{title}</span></span>
      <span className="flex items-center justify-between gap-2 px-3.5 py-2"><span><span className="block font-display text-xl font-black tabular-nums text-live">{apr}</span><span className="text-[10px] font-bold uppercase text-hot-muted">● {t("Ganando 24/7")}</span></span><span className="rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground">{t("Ver mis ganancias")} →</span></span>
    </span>,
  ];
  return <span className="relative isolate grid overflow-hidden rounded-[14px] text-hot-foreground">
    {slides.map((s, k) => <span key={k} aria-hidden={k !== i} className={`col-start-1 row-start-1 transition-opacity duration-700 ${k === i ? "opacity-100" : "pointer-events-none opacity-0"}`}>{s}</span>)}
    {dots && <span aria-hidden className="absolute right-3 top-3 z-10 flex gap-1">{[0, 1, 2].map((k) => <span key={k} className={`h-1.5 rounded-full bg-hot-foreground transition-all ${k === i ? "w-4" : "w-1.5 opacity-50"}`} />)}</span>}
  </span>;
}

/** Seconds left in the current 5-minute round (rounds start on 5-minute marks); client-only to avoid hydration drift. */
function useRoundCountdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => { const tick = () => setLeft(300 - (Math.floor(Date.now() / 1000) % 300)); tick(); const id = setInterval(tick, 1000); return () => clearInterval(id); }, []);
  return left;
}

/** Full-width Doble o Nada hero for the home rotation: live duel lines, round countdown and Sube/Baja buttons. */
export function DobleHero({ title, sub }: { title: string; sub: string }) {
  const t = useT();
  const left = useRoundCountdown();
  const clock = left == null ? "5:00" : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const steps = [["🎯", "Sube o Baja"], ["⏱️", "Ronda de 5 min"], ["💵", "Pago en dólares"]] as const;
  return <div className="duel-ring rounded-3xl p-[2px] shadow-[var(--shadow-duel)]">
    <div className="relative isolate overflow-hidden rounded-[calc(1.5rem-2px)] bg-[image:var(--gradient-duel-surface)] text-hot-foreground">
      <div className="relative isolate h-36 overflow-hidden px-5 pt-4 sm:h-44 sm:px-8">
        <DuelLines />
        <span aria-hidden className="cta-shimmer pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-gradient-to-r from-transparent via-hot-foreground/25 to-transparent" />
        <div className="relative flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-primary-foreground"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground opacity-75 motion-reduce:animate-none" /><span className="relative inline-flex size-2 rounded-full bg-primary-foreground" /></span>{t("En vivo")} · BTC · ETH · SOL</span>
          <span className="rounded-full bg-hot-surface/80 px-2.5 py-0.5 font-display text-sm font-black tabular-nums" aria-label={t("Tiempo de la ronda")}>⏱️ {clock}</span>
        </div>
        <img src={dobleLogo} alt={t("Doble o Nada")} width={900} height={286} className="relative mx-auto mt-3 h-16 w-auto max-w-full -rotate-2 drop-shadow-[0_0_14px_var(--primary)] sm:mx-0 sm:h-20" /><div className="relative mt-1 flex justify-center sm:justify-start"><LightningBadge suffix="5 MIN" /></div>
      </div>
      <div className="px-5 pb-5 pt-3 text-center sm:px-8 md:text-left">
        <h1 className="font-display text-[1.7rem] font-black leading-tight sm:text-4xl">{t(title)}</h1>
        <p className="mt-2 text-sm leading-6 text-hot-muted sm:text-base">{t(sub)}</p>
        <ol className="mt-4 grid grid-cols-3 gap-2 text-[11px] font-bold sm:text-xs">{steps.map(([i, l]) => <li key={l} className="flex flex-col items-center gap-1 rounded-xl bg-hot-surface/70 px-2 py-2"><span aria-hidden className="text-xl">{i}</span>{t(l)}</li>)}</ol>
        <div className="mt-4 grid grid-cols-2 gap-2.5 md:max-w-md">
          <Link to="/mercados" className="cta-attn flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-black text-primary-foreground shadow-[0_0_24px_-4px_var(--primary)] transition-transform active:scale-[0.98]"><TrendingUp size={20} aria-hidden />{t("Sube")}</Link>
          <Link to="/mercados" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-destructive text-lg font-black text-destructive-foreground shadow-[0_0_24px_-4px_var(--destructive)] transition-transform active:scale-[0.98]"><TrendingDown size={20} aria-hidden />{t("Baja")}</Link>
        </div>
        <p className="mt-3 text-[11px] leading-4 text-hot-muted">{t("Los precios y premios cambian en cada ronda. Puedes perder lo que juegas.")}</p>
      </div>
    </div>
  </div>;
}
