import { useT } from "@/lib/i18n";

/** 5-second looping hype demo of a Sube y Baja round (pure CSS/SVG, no video). */
export function PredictPromo() {
  const t = useT();
  return (
    <div className="pp relative mx-auto w-full max-w-xs overflow-hidden rounded-[2rem] border border-border bg-card p-4 shadow-xl" aria-hidden="true">
      <div className="flex items-center justify-between text-xs">
        <span className="font-display font-bold">BTC · 5 min</span>
        <span className="pp-clock rounded-full bg-muted px-2 py-0.5 font-mono text-muted-foreground">00:0<span className="pp-sec" /></span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{t("Precio a batir")} $97,250</p>
      <div className="relative mt-2 h-32">
        <svg viewBox="0 0 200 100" className="h-full w-full" preserveAspectRatio="none">
          <line x1="0" y1="55" x2="200" y2="55" className="stroke-muted-foreground" strokeDasharray="4 4" strokeWidth="1" />
          <path className="pp-up" d="M0 62 L25 58 L50 64 L75 56 L100 60 L125 46 L150 40 L175 30 L200 22" fill="none" stroke="var(--primary)" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
          <path className="pp-down" d="M0 48 L25 52 L50 46 L75 54 L100 50 L125 64 L150 70 L175 80 L200 88" fill="none" stroke="var(--destructive)" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="pp-badge absolute right-1 bottom-0 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">▼ −$85</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <span className="rounded-xl bg-primary/15 py-2.5 text-center text-sm font-bold text-primary">▲ {t("SUBE")}</span>
        <span className="pp-sube rounded-xl bg-destructive py-2.5 text-center text-sm font-bold text-destructive-foreground">▼ {t("BAJA")}</span>
      </div>
      <span className="pp-tap pointer-events-none absolute bottom-6 left-[62%] h-10 w-10 rounded-full bg-foreground/30" />
      <div className="pp-win absolute inset-0 flex flex-col items-center justify-center bg-primary text-primary-foreground">
        <span className="font-display text-3xl font-black">{t("¡Acertaste!")}</span>
        <span className="mt-1 font-display text-2xl font-bold">+$9.80</span>
        <span className="mt-1 text-xs font-medium">{t("directo a tu balance")}</span>
      </div>
      <style>{`
        .pp *{animation-duration:5s;animation-iteration-count:infinite;animation-timing-function:ease-out}
        .pp-up{stroke-dasharray:260;animation-name:ppDraw}
        .pp-down{stroke-dasharray:260;animation-name:ppDraw}
        @keyframes ppDraw{0%,20%{stroke-dashoffset:150}70%,100%{stroke-dashoffset:0}}
        .pp-badge{animation-name:ppBadge}
        @keyframes ppBadge{0%,45%{opacity:0;transform:scale(.6)}55%,100%{opacity:1;transform:scale(1)}}
        .pp-sube{animation-name:ppPress}
        @keyframes ppPress{0%,22%{transform:scale(1)}26%{transform:scale(.9);box-shadow:0 0 0 0 var(--primary)}34%{transform:scale(1);box-shadow:0 0 0 12px transparent}100%{transform:scale(1)}}
        .pp-tap{animation-name:ppTap}
        @keyframes ppTap{0%,20%{opacity:0;transform:scale(.4)}25%{opacity:1;transform:scale(1)}35%,100%{opacity:0;transform:scale(1.6)}}
        .pp-win{animation-name:ppWin}
        @keyframes ppWin{0%,70%{opacity:0;transform:scale(1.15)}76%,94%{opacity:1;transform:scale(1)}100%{opacity:0}}
        .pp-sec::after{content:"5";animation:ppSec 5s steps(1) infinite}
        @keyframes ppSec{0%{content:"5"}20%{content:"4"}40%{content:"3"}60%{content:"2"}80%{content:"1"}}
        @media (prefers-reduced-motion:reduce){.pp *{animation:none!important}.pp-win{opacity:0}}
      `}</style>
    </div>
  );
}
