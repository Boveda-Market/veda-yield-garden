import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Flame, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import { poolYieldOptions } from "@/lib/pool-yield";
import { VAULTS } from "@/lib/vaults";

const gta6 = VAULTS.find((v) => v.id === "gta6");

/** Two compact, high-energy entry tiles kept at the top of Mi Billetera so they stay in the phone's first screen. APR is the live estimate, never hardcoded. */
export function WalletHeroShortcuts() {
  const t = useT();
  const y = useQuery({ ...poolYieldOptions(gta6?.pool ?? ""), enabled: !!gta6 });
  const apr = y.data?.apr;
  const aprLabel = apr != null && apr >= 100 ? `+${Math.round(apr).toLocaleString("en-US")}% APR` : t("Alto octanaje");
  return <section aria-label={t("Accesos rápidos")} className="grid grid-cols-2 gap-2 sm:gap-3">
    <Link to="/app" className="hot-ring group relative block rounded-2xl p-[2px] transition-transform active:scale-[0.98]">
      <span className="relative flex h-full flex-col gap-1.5 overflow-hidden rounded-[14px] bg-[image:var(--gradient-hot-surface)] p-3 text-hot-foreground">
        <span className="hot-cta inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-hot-surface"><Flame size={12} aria-hidden />{aprLabel}</span>
        <span className="font-display text-base font-bold leading-tight">{t("Depositar en Bóvedas")}</span>
        <span className="text-[11px] leading-4 text-hot-muted">{t("Comisiones brutales con el volumen de GTA6")}</span>
        <ChevronRight size={16} aria-hidden className="absolute right-2 top-2 opacity-70 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
    <Link to="/mercados" className="group relative block rounded-2xl bg-primary p-[2px] shadow-[0_0_24px_-6px_var(--primary)] transition-transform active:scale-[0.98]">
      <span className="relative flex h-full flex-col gap-1.5 overflow-hidden rounded-[14px] bg-card p-3">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-primary"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:animate-none" /><span className="relative inline-flex size-2 rounded-full bg-primary" /></span>{t("En vivo")}</span>
        <span className="flex items-center gap-1 font-display text-base font-bold leading-tight"><Zap size={16} className="text-primary" aria-hidden />{t("Doble o Nada")}</span>
        <span className="text-[11px] leading-4 text-muted-foreground">{t("Rondas de 5 min · Hasta +90%")}</span>
        <ChevronRight size={16} aria-hidden className="absolute right-2 top-2 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  </section>;
}
