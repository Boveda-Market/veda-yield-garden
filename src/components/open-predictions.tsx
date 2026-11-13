import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePredictPositions } from "@/lib/predict-positions-query";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import type { PredictPosition } from "@/lib/predict";
import { executePredict, preparePredictSell } from "@/lib/predict.functions";
import { annotateRecord } from "@/lib/predict-history";
import { buildSwap, JUPUSD_MINT, quoteSwap, readTokenBalance } from "@/lib/wallet-actions";
import { PredictPositionCard, usdcText, LivePositionStats, useStrike, roundSeconds } from "@/components/predict-position-card";
import { useLivePrice } from "@/hooks/use-live-price";
import type { MarketId } from "@/lib/markets";
import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { TokenIcon } from "@/components/token-icon";
import { assetOfTitle } from "@/lib/predict";
import { useEffect } from "react";

const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (b: Uint8Array) => btoa(Array.from(b, (x) => String.fromCharCode(x)).join(""));

/** Open Sube/Baja rounds for the connected wallet, with a direct "Cerrar ahora". */
export function useOpenPredictions() {
  const session = useBovedaSession();
  const wallet = session.walletAddress;
  const qc = useQueryClient();
  const q = usePredictPositions(wallet);
  const items = (q.data ?? []).filter((p) => p.status === "open");
  const refresh = useCallback(async () => { await qc.invalidateQueries({ queryKey: ["predict-positions", wallet] }); }, [qc, wallet]);
  return { items, refresh, session, wallet };
}

export function OpenPredictions({ state }: { state: ReturnType<typeof useOpenPredictions> }) {
  const t = useT();
  const { items, refresh, session, wallet } = state;
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const sell = async (p: PredictPosition) => {
    if (!wallet) return; setBusy(p.pubkey); setMsg(null);
    try {
      if (!session.signOnly) throw new Error(t("Tu wallet no admite esta operación."));
      const before = await readTokenBalance(wallet, JUPUSD_MINT).catch(() => 0n);
      const r = await preparePredictSell({ data: { wallet, position: p.pubkey } });
      if (!r.success) throw new Error(r.error);
      const signed = await session.signOnly(fromB64(r.transaction));
      const x = await executePredict({ data: { wallet, signed: toB64(signed), context: r.context } });
      if (!x.success) throw new Error(x.error);
      annotateRecord(wallet, p.pubkey, { soldMicro: p.valueMicro ?? "0", sellSig: x.signature });
      setMsg({ ok: true, text: t("Firma 1 de 2 lista: posición cerrada. Ahora firma la 2 de 2 para cambiarlo a USDC…") });
      // Closing early is free: convert only the JupUSD received from this sale to USDC (no BÓVEDA fee).
      try {
        let got = 0n;
        for (let i = 0; i < 4 && got <= 0n; i++) { await new Promise((res) => setTimeout(res, 2000)); got = (await readTokenBalance(wallet, JUPUSD_MINT)) - before; }
        if (got > 0n) { const q = await quoteSwap("JupUSD", "USDC", got, { feeUsdc: 0n }); await session.signAndSend(await buildSwap(wallet, q)); setMsg({ ok: true, text: t("Posición cerrada. {v} USDC llegaron a tu wallet.", { v: usdcText(q.outAmount) }) }); }
        else setMsg({ ok: true, text: t("Venta confirmada. El USDC está en tu wallet.") });
      } catch { setMsg({ ok: true, text: t("Posición cerrada, pero falta el cambio a USDC. Hazlo en Mi Billetera → Cambiar (JupUSD → USDC).") }); }
      setTimeout(() => void refresh(), 3000);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };
  if (items.length === 0) return <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">{t("No tienes predicciones abiertas ahora mismo.")}</p>;
  return <div className="space-y-3">
    {msg && <p role="status" className={`text-sm ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.text}</p>}
    <div className="grid gap-4 md:grid-cols-2">{items.map((p) => <PredictPositionCard key={p.pubkey} p={p} onSell={() => void sell(p)} selling={busy === p.pubkey} disabled={!!busy} />)}</div>
  </div>;
}

/** Mi Billetera: open Sube/Baja rounds; renders nothing when there are none. */
export function WalletOpenPredictions() {
  const t = useT();
  const state = useOpenPredictions();
  if (state.items.length === 0) return null;
  return <section aria-label={t("Predicciones abiertas")} className="rounded-2xl border border-border bg-card p-4">
    <h3 className="mb-3 font-display text-lg">{t("Predicciones abiertas")}</h3>
    <OpenPredictions state={state} />
  </section>;
}

function Countdown({ close }: { close: number | null }) {
  const t = useT(); const [n, setN] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setN(Date.now()), 1000); return () => clearInterval(id); }, []);
  const left = close ? close * 1000 - n : 0;
  return <span className="tabular-nums">{left > 0 ? `⏱ ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}` : t("Resolviendo…")}</span>;
}

/** Sube y Baja: compact open-round rows with a link to the full card (with live chart) in Ganancias. */
export function CompactOpenPredictions() {
  const t = useT();
  const { items } = useOpenPredictions();
  if (items.length === 0) return null;
  return <section aria-label={t("Predicciones abiertas")} className="space-y-2">
    {items.map((p) => { const a = assetOfTitle(p.title); const Up = p.side === "up"; return (
      <div key={p.pubkey} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5">
        {a && <TokenIcon symbol={a} size={24} />}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold">{a ?? "—"}<span className={`inline-flex items-center rounded-full px-1.5 text-[11px] font-bold ${Up ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{Up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{t(Up ? "Sube" : "Baja")}</span></p>
          <p className="text-xs text-muted-foreground"><Countdown close={p.closeTime} /> · {t("Premio")} <span className="font-semibold text-primary tabular-nums">{usdcText(p.payoutMicro)} USDC</span></p>
          <CompactLive p={p} />
        </div>
        <Link to="/portfolio" className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">{t("Ver posición")}<ChevronRight size={14} /></Link>
      </div>); })}
  </section>;
}

function CompactLive({ p }: { p: PredictPosition }) {
  const a = assetOfTitle(p.title) as MarketId | null;
  const live = useLivePrice(a);
  const dur = roundSeconds(p.title);
  const strike = useStrike(a, p.closeTime && dur ? (p.closeTime - dur) * 1000 : null);
  return <LivePositionStats p={p} price={live.price} strike={strike} compact />;
}
