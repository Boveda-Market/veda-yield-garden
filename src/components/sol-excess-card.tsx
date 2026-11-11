import { useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TokenIcon } from "@/components/token-icon";
import { useT } from "@/lib/i18n";
import { SOL_RESERVE_LAMPORTS } from "@/lib/wallet-actions";
import { MIN_USDC_MICRO, SOL_CONVERT_PERCENTS, SOL_EXCESS_MIN_USD, solConvertLamports, unitsToDecimal } from "@/lib/onboarding";

type Props = { sol: bigint | undefined; usdc: bigint | undefined; solPrice: number | undefined; onConvert: (amount: string) => void };

/** Suggests converting extra SOL to USDC with percent chips; the network reserve always stays. */
export function SolExcessCard({ sol, usdc, solPrice, onConvert }: Props) {
  const t = useT();
  const [pct, setPct] = useState<bigint>(50n);
  if (sol === undefined || usdc === undefined || usdc >= MIN_USDC_MICRO) return null;
  const spendable = solConvertLamports(sol, SOL_RESERVE_LAMPORTS, 100n);
  const spendUsd = solPrice ? Number(spendable) / 1e9 * solPrice : undefined;
  if (!spendUsd || spendUsd < SOL_EXCESS_MIN_USD) return null;
  const lamports = solConvertLamports(sol, SOL_RESERVE_LAMPORTS, pct);
  const usd = Number(lamports) / 1e9 * solPrice!;
  const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { useGrouping: false, minimumFractionDigits: d, maximumFractionDigits: d });
  return <section aria-label={t("Convierte tu SOL a USDC")} className="rounded-2xl border border-primary/40 bg-primary/10 p-5">
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Zap size={14} />{t("Saldo listo para operar")}</p>
    <h2 className="mt-2 font-display text-xl font-semibold">{t("Tienes SOL de sobra: conviértelo a USDC")}</h2>
    <p className="mt-1 text-sm leading-6 text-foreground/85">{t("Para entrar a las bóvedas o a Sube / Baja necesitas USDC (dólares digitales). Elige cuánto de tu SOL quieres cambiar.")}</p>
    <p className="mt-3 flex items-center gap-2 text-sm"><TokenIcon symbol="SOL" size={18} />{t("Disponible para cambiar")}: <span className="font-semibold">{fmt(Number(spendable) / 1e9, 4)} SOL</span><span className="text-muted-foreground">(~${fmt(spendUsd)})</span></p>
    <div role="group" aria-label={t("Porcentaje a convertir")} className="mt-3 grid grid-cols-4 gap-2">
      {SOL_CONVERT_PERCENTS.map((p) => <button key={String(p)} type="button" aria-pressed={pct === p} onClick={() => setPct(p)} className={`rounded-xl border px-2 py-2 text-sm font-semibold transition-colors ${pct === p ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/60"}`}>{p === 100n ? t("Todo") : `${p}%`}</button>)}
    </div>
    <p className="mt-3 text-sm">{t("Recibirás aprox.")}: <span className="font-semibold">~${fmt(usd)} USDC</span></p>
    <p className="mt-1 text-xs text-muted-foreground">{t("Siempre guardamos {sol} SOL para tus costos de red. Verás la cotización exacta y las comisiones antes de firmar.", { sol: unitsToDecimal(SOL_RESERVE_LAMPORTS, 9) })}</p>
    <Button className="mt-4 w-full" disabled={lamports <= 0n} onClick={() => onConvert(unitsToDecimal(lamports, 9))}>{t("Convertir a USDC ahora")}</Button>
  </section>;
}
