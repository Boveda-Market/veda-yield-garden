import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { useT } from "@/lib/i18n";
import { poolYieldOptions } from "@/lib/pool-yield";
import { VAULTS } from "@/lib/vaults";
import { VaultTitle } from "@/components/vault-skin";
import trumpLogo from "@/assets/trump-logo.png";

const trump = VAULTS.find((v) => v.id === "trump");

/** Live estimated APR label for the TRUMP vault (fees 24h / TVL), never hardcoded. */
function useTrumpAprLabel() {
  const t = useT();
  const y = useQuery({ ...poolYieldOptions(trump?.pool ?? ""), enabled: !!trump });
  const apr = y.data?.apr;
  return apr != null && apr >= 100 ? `+${Math.round(apr).toLocaleString("en-US")}% APR` : t("Alto octanaje");
}

/** Small flag strip (navy canton + red/white stripes) used as an accent, never behind text. */
const FlagStrip = () => <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-90 [mask-image:linear-gradient(90deg,transparent,#000_45%)] bg-[image:repeating-linear-gradient(180deg,var(--trump-red)_0_7px,var(--trump-white)_7px_14px)]" />;

/** Three TRUMP slides (presidential poster, coin, be the house) for the Mi Billetera rotation; same compact height as the other slides. */
export function TrumpBannerSlide({ index, cta }: { index: number; cta: React.ReactNode }) {
  const t = useT();
  const apr = useTrumpAprLabel();
  const num = apr.endsWith(" APR") ? apr.replace(" APR", "") : apr;
  const aprChip = <span className="hot-cta flex w-fit shrink-0 items-end gap-1 whitespace-nowrap rounded-xl px-2.5 py-1 leading-none text-hot-surface shadow-[0_0_18px_-2px_var(--hot)]"><Flame size={16} aria-hidden className="flame-flicker mb-0.5 shrink-0" /><span className={`font-display font-black tabular-nums ${apr.endsWith(" APR") ? "text-lg" : "text-sm"}`}>{num}</span>{apr.endsWith(" APR") && <span className="mb-0.5 text-[10px] font-black">APR</span>}</span>;
  const bar = "relative mt-1.5 flex items-center justify-between gap-2 rounded-xl border-2 border-hot bg-hot-surface px-3 py-1.5 text-xs font-extrabold text-hot-foreground shadow-[0_0_18px_-4px_var(--hot)]";
  const vault = trump ?? { id: "trump", name: "Bóveda TRUMP" };
  const body = "relative isolate flex h-full flex-col overflow-hidden rounded-[14px] bg-[image:var(--gradient-hot-surface)] px-3 py-2.5 text-hot-foreground";
  if (index === 0) return <span className={body}>
    <FlagStrip />
    <span className="relative flex items-center justify-between gap-2"><span className="rounded-full bg-hot-surface/85 px-2 py-0.5 text-[10px] font-black uppercase">🇺🇸 {t("Nueva")} · ● {t("En vivo")}</span>{aprChip}</span>
    <VaultTitle vault={vault} className="relative mt-1 h-6" />
    <span className="relative mt-1.5 truncate font-display text-sm font-black leading-tight drop-shadow-[0_1px_6px_var(--hot-surface)] min-[400px]:text-base">{t("La moneda del presidente, cobrando para ti.")}</span>
    <span className={bar}>{cta}</span>
  </span>;
  if (index === 1) return <span className={body}>
    <span aria-hidden className="cta-shimmer pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-gradient-to-r from-transparent via-hot-foreground/25 to-transparent" />
    <span className="relative flex items-center gap-3">
      <img src={trumpLogo} alt="" aria-hidden width={160} height={160} className="h-10 w-10 shrink-0 rounded-full ring-2 ring-hot drop-shadow-[0_0_16px_var(--hot)]" />
      <span className="flex min-w-0 flex-col gap-1"><span className="trump-gold w-fit text-[10px] font-black uppercase tracking-wide">Official Trump · TRUMP</span><span className="font-display text-base font-black leading-tight">{t("Suba o baje TRUMP, cada intercambio te deja intereses.")}</span></span>
    </span>
    <span className="relative mt-1.5 flex items-center justify-between gap-2"><span className="min-w-0 truncate text-[11px] font-bold text-hot-muted">{t("Intereses de cada intercambio")}</span>{aprChip}</span>
    <span className={bar}>{cta}</span>
  </span>;
  return <span className={body}>
    <FlagStrip />
    <span className="relative flex items-center justify-between gap-2"><VaultTitle vault={vault} className="h-6" /><span className="rounded-full bg-hot px-2 py-0.5 text-[10px] font-black uppercase text-hot-surface">🎰 {t("Sé la casa")}</span></span>
    <span className="relative mt-1.5 font-display text-base font-black leading-tight">{t("Sé la casa en cada intercambio.")}</span>
    <span className="relative mt-1 flex flex-wrap gap-1.5 text-[10px] font-bold">{[["💵", "Depositas"], ["⚡", "Piloto automático"], ["📈", "Ganancias automáticas"]].map(([i, l]) => <span key={l} className="rounded-full bg-hot-surface/80 px-2 py-0.5">{i} {t(l!)}</span>)}</span>
    <span className={bar}>{cta}</span>
  </span>;
}
