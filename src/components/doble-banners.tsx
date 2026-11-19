import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n";
import { DuelLines } from "@/components/home-gta6";
import dobleLogo from "@/assets/doble-o-nada-logo.png";

/** Seconds left in the current 5-minute round (rounds start on 5-minute marks); client-only to avoid hydration drift. */
function useRoundClock() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => { const tick = () => setLeft(300 - (Math.floor(Date.now() / 1000) % 300)); tick(); const id = setInterval(tick, 1000); return () => clearInterval(id); }, []);
  return left == null ? "5:00" : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

const cta = "relative mt-2 flex items-center justify-between gap-2 rounded-xl border-2 border-bolt-neon bg-bolt-ink px-3 py-2 text-xs font-extrabold text-hot-foreground shadow-[0_0_18px_-4px_var(--bolt-neon)]";
const live = <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-bolt-ink opacity-75 motion-reduce:animate-none" /><span className="relative inline-flex size-2 rounded-full bg-bolt-ink" /></span>;

/** Three Doble o Nada promo slides (Ronda Relámpago, El Duelo, 2X) for the Mi Billetera top rotation; kept as compact as the GTA6 slides so the rotation never jumps in height. */
export function DobleBannerSlide({ index }: { index: number }) {
  const t = useT();
  const clock = useRoundClock();
  const body = "relative isolate flex h-full flex-col overflow-hidden rounded-[14px] bg-[image:var(--gradient-duel-surface)] p-3 text-hot-foreground";
  if (index === 0) return <span className={body}>
    <DuelLines />
    <span className="relative flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-bolt-neon px-2 py-0.5 text-[10px] font-black uppercase text-bolt-ink">{live}{t("En vivo")}</span><span className="rounded-full border border-hot-muted/60 bg-hot-surface/80 px-2 py-0.5 font-display text-[11px] font-black tabular-nums">⏱️ {clock}</span></span>
    <img src={dobleLogo} alt={t("Doble o Nada")} width={900} height={286} className="relative mt-1.5 h-7 w-auto self-start -rotate-2 drop-shadow-[0_0_10px_var(--bolt-neon)]" />
    <span className="relative mt-1 font-display text-lg font-black leading-tight">{t("Duplica tu jugada en 5 minutos")} <span className="text-bolt">⚡</span></span>
    <span className={cta}><span>👉 {t("Oprime aquí para jugar")}</span><ArrowRight size={14} aria-hidden /></span>
  </span>;
  if (index === 1) return <span className={body}>
    <span className="relative flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-bolt-neon px-2 py-0.5 text-[10px] font-black uppercase text-bolt-ink">{live}BTC · ETH · SOL</span><img src={dobleLogo} alt={t("Doble o Nada")} width={900} height={286} className="h-5 w-auto" /></span>
    <span className="relative mt-1.5 font-display text-base font-black leading-tight">{t("¿Bitcoin sube o baja? Elige tu bando.")}</span>
    <span className="relative mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <span className="rounded-xl border-2 border-bolt-neon bg-bolt-neon/15 px-2 py-1 text-center font-display text-sm font-black text-bolt-neon">▲ {t("SUBE")}<span className="block text-[9px] font-bold">{t("Hasta +90%")}</span></span>
      <span className="font-display text-sm font-black text-bolt drop-shadow-[0_0_8px_var(--bolt)]">VS</span>
      <span className="rounded-xl border-2 border-destructive bg-destructive/15 px-2 py-1 text-center font-display text-sm font-black text-destructive">▼ {t("BAJA")}<span className="block text-[9px] font-bold">{t("Hasta +90%")}</span></span>
    </span>
    <span className={cta}><span>🎯 {t("Entrar al duelo")}</span><ArrowRight size={14} aria-hidden /></span>
  </span>;
  return <span className={body}>
    <span aria-hidden className="cta-shimmer pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-gradient-to-r from-transparent via-hot-foreground/25 to-transparent" />
    <span className="relative flex items-center gap-3">
      <span aria-hidden className="font-display text-4xl font-black leading-none text-bolt drop-shadow-[0_0_18px_var(--bolt)]">2X</span>
      <span className="flex min-w-0 flex-col gap-0.5"><img src={dobleLogo} alt={t("Doble o Nada")} width={900} height={286} className="h-5 w-auto self-start" /><span className="font-display text-base font-black leading-tight">{t("$10 pueden ser $20 antes del café")} ☕</span></span>
    </span>
    <span className={cta}><span>🚀 {t("Probar una jugada")}</span><ArrowRight size={14} aria-hidden /></span>
  </span>;
}
