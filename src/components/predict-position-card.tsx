import { TokenIcon } from "@/components/token-icon";
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
  const Row = ({ k, v, tone }: { k: string; v: string; tone?: string }) => <div className="flex justify-between gap-2"><span className="text-muted-foreground">{k}</span><span className={`font-medium ${tone ?? ""}`}>{v}</span></div>;
  return <article className="rounded-xl border border-border bg-card p-4 text-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-semibold">{Up ? <ArrowUpRight size={16} className="text-primary" /> : <ArrowDownRight size={16} className="text-destructive" />}{asset && <TokenIcon symbol={asset} size={18} />}{asset ?? "—"} · {t(Up ? "Sube" : "Baja")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{when}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${open ? (pnl !== null && pnl < 0n ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary") : won ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
        {open ? (mmss ? t("Cierra en {v}", { v: mmss }) : t("Resolviendo…")) : won === null ? t("Cerrada") : won ? t("Acertaste") : t("No acertaste")}
      </span>
    </div>
    <div className="mt-3 space-y-1.5 text-xs">
      <Row k={t("Invertido")} v={`${usdcText(cost)} USDC`} />
      <Row k={t("Contratos")} v={`${(Number(p.contractsMicro) / 1e6).toLocaleString(locale, { maximumFractionDigits: 2 })}${ppc !== null ? ` · ${(ppc * 100).toFixed(1)}¢ ${t("c/u")}` : ""}`} />
      <Row k={t("Pago si aciertas")} v={`${usdcText(payout)} USDC (+${usdcText(profit)}${cost > 0n ? ` · ${(Number(payout) / Number(cost)).toFixed(2)}×` : ""})`} tone="text-primary" />
      {open && <Row k={t("Valor si vendes ahora")} v={p.valueMicro ? `${usdcText(p.valueMicro)} USDC` : t("No disponible")} />}
      {pnl !== null && <Row k={open ? t("Resultado actual") : t("Resultado")} v={`${pnl >= 0n ? "+" : ""}${usdcText(pnl)} USDC`} tone={pnl >= 0n ? "text-primary" : "text-destructive"} />}
      {p.closeTime && <Row k={t("Cierre de la ronda")} v={new Date(p.closeTime * 1000).toLocaleString(locale, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })} />}
    </div>
    {open && onSell && <Button className="mt-3 w-full" size="sm" variant="outline" disabled={disabled} onClick={onSell}>{selling ? <Loader2 className="animate-spin" size={14} /> : t("Vender ahora")}</Button>}
    {!open && won && <div className="mt-3 rounded-xl bg-primary/10 p-3"><p className="text-xs text-muted-foreground">{t("Cantidad final para tu wallet")}</p><p className="font-display text-xl font-bold text-primary tabular-nums">{usdcText(payout)} USDC</p><p className="text-xs text-muted-foreground">{t("Ganancia neta")} +{usdcText(profit)} USDC</p>
      {onClaim && <Button className="mt-2 w-full" size="sm" disabled={disabled} onClick={onClaim}>{claiming ? <Loader2 className="animate-spin" size={14} /> : t("Reclamar ganancias")}</Button>}
      {onClaim && <p className="mt-2 text-[11px] font-semibold text-foreground">{t("Para reclamar firmarás dos transacciones: 1) cobrar el pago y 2) cambiarlo a USDC.")}</p>}
      <p className="mt-2 text-[11px] text-muted-foreground">{t("Normalmente se acredita solo. Si aún no lo ves en tu wallet, reclámalo aquí.")}</p></div>}
  </article>;
}
