import { PriceChart } from "@/components/price-chart";
import { useLivePrice } from "@/hooks/use-live-price";
import { fetchPriceAt, type MarketId } from "@/lib/markets";
import { TokenIcon } from "@/components/token-icon";
import { PoweredBy } from "@/components/powered-by";
import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, useLocale } from "@/lib/i18n";
import { assetOfTitle, positionWon, pricePerContract, type PredictPosition } from "@/lib/predict";

export const usdcText = (micro: string | bigint | null) => micro === null ? "—" : (Number(micro) / 1e6).toFixed(2);

/** Round length in seconds from the title ("1:15PM-1:30PM ET" → 900); daily rounds ("on …") last a day. */
export function roundSeconds(title: string): number | null {
  const m = /(\d{1,2})(?::(\d{2}))?(AM|PM)-(\d{1,2})(?::(\d{2}))?(AM|PM)/i.exec(title);
  if (m) {
    const min = (h: string, mm: string | undefined, ap: string) => ((Number(h) % 12) + (ap.toUpperCase() === "PM" ? 12 : 0)) * 60 + Number(mm ?? 0);
    let d = min(m[4]!, m[5], m[6]!) - min(m[1]!, m[2], m[3]!); if (d <= 0) d += 1440;
    return d * 60;
  }
  return / Up or Down on /i.test(title) ? 86400 : null;
}

/** Opening price of the round (price to beat), retried until the opening candle is published. */
export function useStrike(asset: MarketId | null, openMs: number | null) {
  const [v, setV] = useState<number | undefined>();
  useEffect(() => {
    if (!asset || !openMs) return;
    let alive = true, timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => void fetchPriceAt(asset, openMs).then((x) => { if (!alive) return; if (x) setV(x); else timer = setTimeout(load, 4_000); });
    load();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [asset, openMs]);
  return v;
}

function useNow() { const [n, setN] = useState(() => Date.now()); useEffect(() => { const id = setInterval(() => setN(Date.now()), 1000); return () => clearInterval(id); }, []); return n; }

/** Text that flashes green/red whenever its numeric value ticks up/down. */
function Tick({ value, children, className = "" }: { value: number | undefined; children: React.ReactNode; className?: string }) {
  const prev = useRef<number | undefined>(value); const [dir, setDir] = useState<0 | 1 | -1>(0);
  useEffect(() => { if (value === undefined) return; const p = prev.current; prev.current = value; if (p === undefined || p === value) return; setDir(value > p ? 1 : -1); const id = setTimeout(() => setDir(0), 700); return () => clearTimeout(id); }, [value]);
  return <span className={`rounded px-1 tabular-nums transition-colors duration-500 ${dir === 1 ? "bg-primary/25 text-primary" : dir === -1 ? "bg-destructive/25 text-destructive" : ""} ${className}`}>{children}</span>;
}

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Live trading strip: principal, live asset price vs price to beat and current profit if the round closed now. */
export function LivePositionStats({ p, price, strike, compact }: { p: PredictPosition; price: number | undefined; strike: number | undefined; compact?: boolean }) {
  const t = useT();
  const cost = Number(p.costMicro || "0") / 1e6, payout = Number(p.payoutMicro || "0") / 1e6;
  const diff = price !== undefined && strike ? price - strike : null;
  const winning = diff === null ? null : p.side === "up" ? diff >= 0 : diff < 0;
  const gain = winning === null ? null : winning ? payout - cost : -cost;
  const gainTxt = gain === null ? "—" : `${gain >= 0 ? "+" : "-"}${Math.abs(gain).toFixed(2)} USDC`;
  const tone = winning === null ? "" : winning ? "text-primary" : "text-destructive";
  if (compact) return <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
    <span>{t("Inv.")} <span className="font-semibold text-foreground tabular-nums">{cost.toFixed(2)}</span></span>·
    <span className="inline-flex items-center gap-1"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" /></span><Tick value={price} className="font-semibold text-foreground">{price !== undefined ? money(price) : "—"}</Tick></span>·
    <Tick value={gain ?? undefined} className={`font-bold ${tone}`}>{gainTxt}</Tick>
  </p>;
  return <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border bg-background/40 p-3 text-center">
    <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("Invertido")}</p><p className="font-display text-sm font-semibold tabular-nums">{cost.toFixed(2)} USDC</p></div>
    <div><p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />{t("Precio en vivo")}</p><Tick value={price} className="font-display text-sm font-semibold">{price !== undefined ? money(price) : "—"}</Tick>{diff !== null && <p className={`text-[10px] font-bold tabular-nums ${diff >= 0 ? "text-primary" : "text-destructive"}`}>{diff >= 0 ? "▲ +" : "▼ -"}{money(Math.abs(diff)).slice(1)}</p>}</div>
    <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("Ganancia actual")}</p><Tick value={gain ?? undefined} className={`font-display text-sm font-bold ${tone}`}>{gainTxt}</Tick><p className="text-[10px] text-muted-foreground">{winning === null ? "" : winning ? t("Vas ganando") : t("Vas perdiendo")}</p></div>
  </div>;
}

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
  const dur = roundSeconds(p.title);
  const strike = useStrike(open && asset ? (asset as MarketId) : null, p.closeTime && dur ? (p.closeTime - dur) * 1000 : null);
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
    {open && asset && <LivePositionStats p={p} price={live.price} strike={strike} />}
    {open && asset && mmss && <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background/40 py-2"><PriceChart market={asset as MarketId} points={live.points} price={live.price} reference={strike} referenceLabel={t("A batir")} /></div>}
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
