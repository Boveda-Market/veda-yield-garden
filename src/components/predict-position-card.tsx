import { PriceChart } from "@/components/price-chart";
import { useLivePrice } from "@/hooks/use-live-price";
import type { MarketId } from "@/lib/markets";
import { usePriceToBeat } from "@/hooks/use-price-to-beat";
import { TokenIcon } from "@/components/token-icon";
import { PoweredBy } from "@/components/powered-by";
import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailsToggle } from "@/components/ui/details-toggle";
import { useT, useLocale } from "@/lib/i18n";
import { assetOfTitle, positionLeading, positionOdds, positionWon, pricePerContract, type PredictPosition, type PredictWindow, type RoundOdds } from "@/lib/predict";
import { useLiveRounds } from "@/lib/predict-rounds-query";

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

/** Round window in the viewer's own time zone (titles are in US Eastern time, which confuses other regions). */
export function roundWindowText(title: string, closeTime: number | null, locale?: string, timeZone?: string): string {
  const dur = roundSeconds(title);
  if (!closeTime || !dur) return title.split(" - ")[1] ?? "";
  const end = new Date(closeTime * 1000), start = new Date((closeTime - dur) * 1000);
  const day = (d: Date) => d.toLocaleDateString(locale, { day: "numeric", month: "short", timeZone });
  const hm = (d: Date) => d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone });
  return dur >= 86400 ? `${day(start)} ${hm(start)} – ${day(end)} ${hm(end)}` : `${day(end)} · ${hm(start)} – ${hm(end)}`;
}

/** Price to beat of a position's round, from Polymarket (window from the round length, opening from its close). */
export function useStrike(asset: MarketId | null, closeTime: number | null, dur: number | null) {
  const window: PredictWindow | null = dur === 300 ? "5m" : dur === 900 ? "15m" : dur === 14_400 ? "4h" : null;
  return usePriceToBeat(asset, window, closeTime && dur ? closeTime - dur : null);
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
/** Market odds for an open position, shared by its card, compact row and chart. */
export function usePositionOdds(p: PredictPosition): RoundOdds | undefined {
  const rounds = useLiveRounds(p.status === "open");
  return positionOdds(rounds.data ?? [], p);
}

export function LivePositionStats({ p, price, strike, odds, compact }: { p: PredictPosition; price: number | undefined; strike: number | undefined; odds: RoundOdds | undefined; compact?: boolean }) {
  const t = useT();
  const now = useNow();
  // After the bell the round is decided by the official close: freeze the last price seen before it, never later ticks.
  const ended = !!p.closeTime && now >= p.closeTime * 1000;
  const lastOpen = useRef<number | undefined>(undefined);
  if (!ended && price !== undefined) lastOpen.current = price;
  if (ended) price = lastOpen.current;
  const cost = Number(p.costMicro || "0") / 1e6, payout = Number(p.payoutMicro || "0") / 1e6;
  if (ended) return <p className={compact ? "mt-0.5 text-[11px] font-semibold text-muted-foreground" : "mt-4 rounded-xl border border-border bg-muted/50 p-3 text-center text-sm font-semibold text-muted-foreground"}>⏳ {t("Ronda finalizada · Confirmando el resultado oficial…")}</p>;
  const diff = price !== undefined && strike ? price - strike : null;
  // Who leads comes only from the market odds: the official result uses an oracle average, not this spot price.
  const winning = positionLeading(p.side, odds);
  const gain = winning === null ? null : winning ? payout - cost : -cost;
  const gainTxt = gain === null ? "—" : `${gain >= 0 ? "+" : "-"}$${Math.abs(gain).toFixed(2)}`;
  const tone = winning === null ? "" : winning ? "text-primary" : "text-destructive";
  if (compact) return <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
    <span>{t("Inv.")} <span className="font-semibold text-foreground tabular-nums">{cost.toFixed(2)}</span></span>·
    <span className="inline-flex items-center gap-1"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" /></span><Tick value={price} className="font-semibold text-foreground">{price !== undefined ? money(price) : "—"}</Tick></span>·
    <Tick value={gain ?? undefined} className={`font-bold ${tone}`}>{gainTxt}</Tick>
  </p>;
  return <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-border bg-background/40 p-2.5 text-center">
    <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("Invertido")}</p><p className="font-display text-sm font-semibold tabular-nums">${cost.toFixed(2)}</p></div>
    <div><p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />{t("Precio en vivo")}</p><Tick value={price} className="font-display text-sm font-semibold">{price !== undefined ? money(price) : "—"}</Tick>{diff !== null && <p className={`text-[10px] font-bold tabular-nums ${diff >= 0 ? "text-primary" : "text-destructive"}`}>{diff >= 0 ? "▲ +" : "▼ -"}{money(Math.abs(diff)).slice(1)}</p>}</div>
    <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("Ganancia actual")}</p><Tick value={gain ?? undefined} className={`font-display text-sm font-bold ${tone}`}>{gainTxt}</Tick><p className="text-[10px] text-muted-foreground">{winning === null ? "" : winning ? t("Vas ganando") : t("Vas perdiendo")}</p></div>
  </div>;
}

/** Transparent detail card for one prediction position: side, contracts, price, stake, live value, payout, countdown and result. */
export function PredictPositionCard({ p, onSell, selling, disabled, onClaim, claiming }: { p: PredictPosition; onSell?: () => void; selling?: boolean; disabled?: boolean; onClaim?: () => void; claiming?: boolean }) {
  const t = useT(); const locale = useLocale(); const now = useNow();
  const open = p.status === "open";
  const asset = assetOfTitle(p.title);
  const when = roundWindowText(p.title, p.closeTime, locale);
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
  const strike = useStrike(open && asset ? (asset as MarketId) : null, p.closeTime, dur);
  const odds = usePositionOdds(p);
  const Row = ({ k, v, tone }: { k: string; v: string; tone?: string }) => <div className="flex justify-between gap-2"><span className="text-muted-foreground">{k}</span><span className={`font-medium tabular-nums ${tone ?? ""}`}>{v}</span></div>;
  return <article className="rounded-lg border border-border bg-card p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold">{asset && <TokenIcon symbol={asset} size={22} />}{asset ?? "—"}
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${Up ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{Up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{t(Up ? "Sube" : "Baja")}</span></h3>
        <p className="mt-1 text-xs text-muted-foreground">{when}</p>
        <PoweredBy brand="polymarket" className="mt-1 !justify-start" />
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${open ? (!mmss ? "bg-muted text-muted-foreground" : pnl !== null && pnl < 0n ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary") : won ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
        {open ? (mmss ? `⏱ ${t("Cierra en {v}", { v: mmss })}` : t("Resolviendo…")) : won === null ? t("Cerrada") : won ? t("Acertaste") : t("No acertaste")}
      </span>
    </div>
    {open && asset && <LivePositionStats p={p} price={live.price} strike={strike} odds={odds} />}
    {open && asset && mmss && <div className="mt-3 overflow-hidden rounded-xl border border-border bg-background/40 py-2"><PriceChart market={asset as MarketId} points={live.points} price={live.price} reference={strike} referenceLabel={t("A batir")} odds={odds} /></div>}
    {(open || !won) && <><p className="mt-3 text-xs text-muted-foreground">{t("Premio si aciertas")}</p>
    <p className="font-display text-3xl font-semibold text-primary tabular-nums">${usdcText(payout)}</p>
    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{t("Pones")} ${usdcText(cost)} · {t("Ganancia posible")} +${usdcText(profit)}{cost > 0n ? ` (${(Number(payout) / Number(cost)).toFixed(2)}×)` : ""}</p></>}
    {open && onSell && <Button className="mt-3 w-full" variant="outline" disabled={disabled} onClick={onSell}>{selling ? <Loader2 className="animate-spin" size={16} /> : p.valueMicro ? t("Cerrar y vender ahora · ≈ ${v}", { v: usdcText(p.valueMicro) }) : t("Cerrar ahora")}</Button>}
    {!open && won && <div className="mt-3 rounded-xl bg-primary/10 p-3"><p className="text-xs text-muted-foreground">{t("Cantidad final para tu wallet")}</p><p className="font-display text-3xl font-bold text-primary tabular-nums">${usdcText(payout)}</p><p className="text-xs text-muted-foreground">{t("Ganancia neta")} +${usdcText(profit)}</p>
      {onClaim && <Button className="mt-2 w-full" disabled={disabled} onClick={onClaim}>{claiming ? <Loader2 className="animate-spin" size={16} /> : t("Reclamar premio ganado")}</Button>}</div>}
    {/* Breakdown and how-it-works notes stay one tap away so the card fits one phone screen. */}
    <div className="mt-2"><DetailsToggle>
    <div className="space-y-1.5 rounded-xl bg-secondary/50 p-3 text-sm">
      {open && <Row k={t("Valor si vendes ahora")} v={p.valueMicro ? `$${usdcText(p.valueMicro)}` : t("No disponible")} />}
      {!open && pnl !== null && <Row k={t("Resultado")} v={`${pnl >= 0n ? "+" : "-"}$${usdcText(pnl < 0n ? -pnl : pnl)}`} tone={pnl >= 0n ? "text-primary" : "text-destructive"} />}
      <Row k={t("Contratos")} v={`${(Number(p.contractsMicro) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 })}${ppc !== null ? ` · ${(ppc * 100).toFixed(1)}¢ ${t("c/u")}` : ""}`} />
      {p.closeTime && <Row k={t("Cierre de la ronda")} v={new Date(p.closeTime * 1000).toLocaleString(locale, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })} />}
    </div>
    {open && <p className="text-xs text-muted-foreground">{t("Se cierra sola al expirar el tiempo. Si ganas, aparece tu premio para reclamar; si pierdes, desaparece.")}</p>}
    {open && onSell && <p className="text-xs text-muted-foreground">{t("Al cerrar, el total pasa a tus dólares disponibles.")}</p>}
    {!open && won && <p className="text-xs text-muted-foreground">{t("Normalmente se acredita solo. Si aún no lo ves en tu wallet, reclámalo aquí.")}</p>}
    </DetailsToggle></div>
  </article>;
}
