import { PriceChart } from "@/components/price-chart";
import { useLivePrice } from "@/hooks/use-live-price";
import type { MarketId } from "@/lib/markets";
import { TokenIcon } from "@/components/token-icon";
import { PoweredBy } from "@/components/powered-by";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, useLocale } from "@/lib/i18n";
import { assetOfTitle, positionWon, pricePerContract, type PredictPosition } from "@/lib/predict";

export const usdcText = (micro: string | bigint | null) => micro === null ? "—" : (Number(micro) / 1e6).toFixed(2);

function useNow() { const [n, setN] = useState(() => Date.now()); useEffect(() => { const id = setInterval(() => setN(Date.now()), 1000); return () => clearInterval(id); }, []); return n; }

/** Transparent detail card for one prediction position: side, contracts, price, stake, live value, payout, countdown and result. */
export function PredictPositionCard({ p, onSell, selling, disabled, onClaim, claiming }: { p: PredictPosition; onSell?: () => void; selling?: boolean; disabled?: boolean; onClaim?: () => void; claiming?: boolean }) {
  const t = useT(); const locale = useLocale(); const now = useNow();
  const open = p.status === "open";
  const asset = assetOfTitle(p.title);
  const when = p.title.split(" - ")[1] ?? "";
  const pnl = p.pnlMicro ? BigInt(p.pnlMicro) : null;
  const cost = BigInt(p.costMicro || "0"), payout = BigInt(p.payoutMicro || "0");
  const profit = payout - cost;
  const ppc = pricePerContract(p);
  const left = p.closeTime ? p.closeTime * 1000 - now : null;
  const mmss = left !== null && left > 0 ? `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}` : null;
  const won = open ? null : positionWon(p);
  const Up = p.side === "up";
  const live = useLivePrice(open && asset ? (asset as MarketId) : null);
  const Row = ({ k, v, tone }: { k: string; v: string; tone?: string }) => <div className="flex justify-between gap-2"><span className="text-muted-foreground">{k}</span><span className={`font-medium tabular-nums ${tone ?? ""}`}>{v}</span></div>;
  return <article className="rounded-lg border border-border bg-card p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold">{asset && <TokenIcon symbol={asset} size={22} />}{asset ?? "—"}
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${Up ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{Up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{t(Up ? "Sube" : "Baja")}</span></h3>
        <p className="mt-1 text-xs text-muted-foreground">{when}</p>
        <PoweredBy brand="polymarket" className="mt-1 !justify-start" />
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${open ? (pnl !== null && pnl < 0n ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary") : won ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
        {open ? (mmss ? `⏱ ${t("Cierra en {v}", { v: mmss })}` : t("Resolviendo…")) : won === null ? t("Cerrada") : won ? t("Acertaste") : t("No acertaste")}
      </span>
    </div>
    {open && asset && <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background/40 py-2"><PriceChart market={asset as MarketId} points={live.points} price={live.price} /></div>}
    <p className="mt-4 text-xs text-muted-foreground">{t("Premio si aciertas")}</p>
    <p className="font-display text-3xl font-semibold text-primary tabular-nums">{usdcText(payout)} USDC</p>
    <p className="mt-1 text-xs text-muted-foreground tabular-nums">{t("Invertido")}: {usdcText(cost)} USDC · {t("Ganancia posible")} +{usdcText(profit)}{cost > 0n ? ` (${(Number(payout) / Number(cost)).toFixed(2)}×)` : ""}</p>
    <div className="mt-4 space-y-1.5 rounded-xl bg-secondary/50 p-3 text-sm">
      {open && <Row k={t("Valor si vendes ahora")} v={p.valueMicro ? `${usdcText(p.valueMicro)} USDC` : t("No disponible")} />}
      {pnl !== null && <Row k={open ? t("Resultado actual") : t("Resultado")} v={`${pnl >= 0n ? "+" : ""}${usdcText(pnl)} USDC`} tone={pnl >= 0n ? "text-primary" : "text-destructive"} />}
      <Row k={t("Contratos")} v={`${(Number(p.contractsMicro) / 1e6).toLocaleString(locale, { maximumFractionDigits: 2 })}${ppc !== null ? ` · ${(ppc * 100).toFixed(1)}¢ ${t("c/u")}` : ""}`} />
      {p.closeTime && <Row k={t("Cierre de la ronda")} v={new Date(p.closeTime * 1000).toLocaleString(locale, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })} />}
    </div>
    {open && <p className="mt-3 text-xs text-muted-foreground">{t("Se cierra sola al expirar el tiempo. Si ganas, aparece tu premio para reclamar; si pierdes, desaparece.")}</p>}
    {open && onSell && <Button className="mt-4 w-full" variant="outline" disabled={disabled} onClick={onSell}>{selling ? <Loader2 className="animate-spin" size={16} /> : p.valueMicro ? t("Cerrar y vender ahora · ≈ {v} USDC", { v: usdcText(p.valueMicro) }) : t("Cerrar ahora")}</Button>}
    {!open && won && <div className="mt-4 rounded-xl bg-primary/10 p-3"><p className="text-xs text-muted-foreground">{t("Cantidad final para tu wallet")}</p><p className="font-display text-xl font-bold text-primary tabular-nums">{usdcText(payout)} USDC</p><p className="text-xs text-muted-foreground">{t("Ganancia neta")} +{usdcText(profit)} USDC</p>
      {onClaim && <Button className="mt-2 w-full" disabled={disabled} onClick={onClaim}>{claiming ? <Loader2 className="animate-spin" size={16} /> : t("Reclamar premio · {v} USDC", { v: usdcText(payout) })}</Button>}
      {onClaim && <p className="mt-2 text-[11px] font-semibold text-foreground">{t("Para reclamar firmarás dos transacciones: 1) cobrar el pago y 2) cambiarlo a USDC.")}</p>}
      <p className="mt-2 text-[11px] text-muted-foreground">{t("Normalmente se acredita solo. Si aún no lo ves en tu wallet, reclámalo aquí.")}</p></div>}
  </article>;
}
