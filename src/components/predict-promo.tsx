import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

type Scene = { pick: "up" | "down"; win: boolean };
const SCENES: Scene[] = [
  { pick: "up", win: true },
  { pick: "down", win: true },
  { pick: "down", win: false },
];
const RISE = "M0 62 L25 58 L50 64 L75 56 L100 60 L125 46 L150 40 L175 30 L200 22";
const FALL = "M0 48 L25 52 L50 46 L75 54 L100 50 L125 64 L150 70 L175 80 L200 88";

/** Looping 5-second demos of Sube y Baja rounds: win going up, win going down, and an honest loss. */
export function PredictPromo() {
  const t = useT();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % SCENES.length), 5000);
    return () => clearInterval(id);
  }, []);
  const s = SCENES[i] ?? SCENES[0]!;
  const pickUp = s.pick === "up";
  return (
    <div key={i} className="pp relative mx-auto w-full max-w-xs overflow-hidden rounded-[2rem] border border-border bg-card p-4 shadow-xl" aria-hidden="true">
      <div className="flex items-center justify-between text-xs">
        <span className="font-display font-bold">BTC · 5 min</span>
        <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-muted-foreground">00:0<span className="pp-sec" /></span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{t("Precio a batir")} $97,250</p>
      <div className="relative mt-2 h-32">
        <svg viewBox="0 0 200 100" className="h-full w-full" preserveAspectRatio="none">
          <line x1="0" y1="55" x2="200" y2="55" className="stroke-muted-foreground" strokeDasharray="4 4" strokeWidth="1" />
          <path className="pp-line" d={pickUp === s.win ? RISE : FALL} fill="none" stroke="var(--primary)" strokeWidth={pickUp ? 3 : 2} opacity={pickUp ? 1 : 0.6} strokeLinecap="round" />
          <path className="pp-line" d={pickUp === s.win ? FALL : RISE} fill="none" stroke="var(--destructive)" strokeWidth={pickUp ? 2 : 3} opacity={pickUp ? 0.6 : 1} strokeLinecap="round" />
        </svg>
        {s.win
          ? <span className="pp-badge absolute right-1 top-0 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-bold text-foreground">▲ +$85</span>
          : <span className="pp-badge absolute bottom-0 right-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">▼ −$85</span>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <span className={`${pickUp ? "pp-press bg-primary text-primary-foreground" : "bg-primary/15 text-primary"} rounded-xl py-2.5 text-center text-sm font-bold`}>▲ {t("SUBE")}</span>
        <span className={`${pickUp ? "bg-destructive/15 text-destructive" : "pp-press bg-destructive text-destructive-foreground"} rounded-xl py-2.5 text-center text-sm font-bold`}>▼ {t("BAJA")}</span>
      </div>
      <span className={`pp-tap pointer-events-none absolute bottom-6 h-10 w-10 rounded-full bg-foreground/30 ${pickUp ? "left-[24%]" : "left-[62%]"}`} />
      {s.win
        ? <div className="pp-end absolute inset-0 flex flex-col items-center justify-center bg-primary text-primary-foreground">
            <span className="font-display text-3xl font-black">{t("¡Acertaste!")}</span>
            <span className="mt-1 font-display text-2xl font-bold">+$9.80</span>
            <span className="mt-1 text-xs font-medium">{t("en 5 minutos, directo a tu balance")}</span>
          </div>
        : <div className="pp-end absolute inset-0 flex flex-col items-center justify-center bg-destructive text-destructive-foreground">
            <span className="font-display text-3xl font-black">{t("No acertaste")}</span>
            <span className="mt-1 font-display text-xl font-bold">{t("Invertido")}: $5.00</span>
            <span className="mt-1 text-xs">{t("Solo arriesgas lo que eliges")}</span>
          </div>}
      <style>{`
        .pp *{animation-duration:5s;animation-fill-mode:both;animation-timing-function:ease-out}
        .pp-line{stroke-dasharray:260;animation-name:ppDraw}
        @keyframes ppDraw{0%,20%{stroke-dashoffset:150}70%,100%{stroke-dashoffset:0}}
        .pp-badge{animation-name:ppBadge}
        @keyframes ppBadge{0%,45%{opacity:0;transform:scale(.6)}55%,100%{opacity:1;transform:scale(1)}}
        .pp-press{animation-name:ppPress}
        @keyframes ppPress{0%,22%{transform:scale(1)}26%{transform:scale(.9)}34%,100%{transform:scale(1)}}
        .pp-tap{animation-name:ppTap}
        @keyframes ppTap{0%,20%{opacity:0;transform:scale(.4)}25%{opacity:1;transform:scale(1)}35%,100%{opacity:0;transform:scale(1.6)}}
        .pp-end{animation-name:ppEnd}
        @keyframes ppEnd{0%,70%{opacity:0;transform:scale(1.15)}76%,96%{opacity:1;transform:scale(1)}100%{opacity:0}}
        .pp-sec::after{content:"5";animation:ppSec 5s steps(1) both}
        @keyframes ppSec{0%{content:"5"}20%{content:"4"}40%{content:"3"}60%{content:"2"}80%{content:"1"}}
        @media (prefers-reduced-motion:reduce){.pp *{animation:none!important}.pp-end{opacity:0}}
      `}</style>
    </div>
  );
}
