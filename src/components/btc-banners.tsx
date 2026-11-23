import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { useT } from "@/lib/i18n";
import { poolYieldOptions } from "@/lib/pool-yield";
import { VAULTS } from "@/lib/vaults";
import { BitcoinBlocks, VaultTitle } from "@/components/vault-skin";

const btc = VAULTS.find((v) => v.id === "btc");

/** Live estimated APR label for the Bitcoin vault (fees 24h / TVL), never hardcoded; words when unavailable or low. */
function useBtcAprLabel() {
  const t = useT();
  const y = useQuery({ ...poolYieldOptions(btc?.pool ?? ""), enabled: !!btc });
  const apr = y.data?.apr;
  return apr != null && apr >= 10 ? `+${Math.round(apr).toLocaleString("en-US")}% APR` : t("Rango activo");
}

/** Three Bitcoin slides (digital gold, every trade pays, be the house) for the Mi Billetera rotation; same compact height as the others. */
export function BtcBannerSlide({ index, cta }: { index: number; cta: React.ReactNode }) {
  const t = useT();
  const apr = useBtcAprLabel();
  const num = apr.endsWith(" APR") ? apr.replace(" APR", "") : apr;
  const aprChip = <span className="hot-cta flex w-fit items-end gap-1 rounded-xl px-2.5 py-1 leading-none text-hot-surface shadow-[0_0_18px_-2px_var(--hot)]"><Flame size={16} aria-hidden className="flame-flicker mb-0.5 shrink-0" /><span className="font-display text-lg font-black tabular-nums">{num}</span>{apr.endsWith(" APR") && <span className="mb-0.5 text-[10px] font-black">APR</span>}</span>;
  const bar = "relative mt-1.5 flex items-center justify-between gap-2 rounded-xl border-2 border-hot bg-hot-surface px-3 py-1.5 text-xs font-extrabold text-hot-foreground shadow-[0_0_18px_-4px_var(--hot)]";
  const vault = btc ?? { id: "btc", name: "Bóveda Bitcoin" };
  const body = "relative isolate flex h-full flex-col overflow-hidden rounded-[14px] bg-[image:var(--gradient-hot-surface)] px-3 py-2.5 text-hot-foreground";
  if (index === 0) return <span className={body}>
    <BitcoinBlocks />
    <span className="relative flex items-center justify-between gap-2"><span className="rounded-full bg-hot-surface/85 px-2 py-0.5 text-[10px] font-black uppercase">₿ {t("Nueva")} · ● {t("En vivo")}</span>{aprChip}</span>
    <VaultTitle vault={vault} className="relative mt-1 h-6" />
    <span className="relative mt-1.5 font-display text-base font-black leading-tight drop-shadow-[0_1px_6px_var(--hot-surface)]">{t("El oro digital, cobrando para ti.")}</span>
    <span className={bar}>{cta}</span>
  </span>;
  if (index === 1) return <span className={body}>
    <span aria-hidden className="cta-shimmer pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-gradient-to-r from-transparent via-hot-foreground/25 to-transparent" />
    <span className="relative flex items-center gap-3">
      <img src="/tokens/btc.svg" alt="" aria-hidden width={160} height={160} className="h-10 w-10 shrink-0 rounded-full ring-2 ring-hot drop-shadow-[0_0_16px_var(--hot)]" />
      <span className="flex min-w-0 flex-col gap-1"><span className="w-fit text-[10px] font-black uppercase tracking-wide text-hot-2">Bitcoin · BTC</span><span className="font-display text-base font-black leading-tight">{t("Suba o baje Bitcoin, cada intercambio te deja intereses.")}</span></span>
    </span>
    <span className="relative mt-1.5 flex items-center justify-between gap-2"><span className="text-[11px] font-bold text-hot-muted">{t("La moneda más negociada del mundo")}</span>{aprChip}</span>
    <span className={bar}>{cta}</span>
  </span>;
  return <span className={body}>
    <BitcoinBlocks />
    <span className="relative flex items-center justify-between gap-2"><VaultTitle vault={vault} className="h-6" /><span className="rounded-full bg-hot px-2 py-0.5 text-[10px] font-black uppercase text-hot-surface">🎰 {t("Sé la casa")}</span></span>
    <span className="relative mt-1.5 font-display text-base font-black leading-tight">{t("Gana con Bitcoin sin adivinar el precio.")}</span>
    <span className="relative mt-1 flex flex-wrap gap-1.5 text-[10px] font-bold">{[["💵", "Depositas"], ["⚡", "Piloto automático"], ["📈", "Ganancias automáticas"]].map(([i, l]) => <span key={l} className="rounded-full bg-hot-surface/80 px-2 py-0.5">{i} {t(l!)}</span>)}</span>
    <span className={bar}>{cta}</span>
  </span>;
}
