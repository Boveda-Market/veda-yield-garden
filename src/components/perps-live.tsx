import { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ExternalLink, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import { perpOpenFee, PERP_MAX_LEVERAGE, PERP_MAX_USDC, PERP_MIN_LEVERAGE, PERP_MIN_USDC, type PerpAsset, type PerpPosition, type PerpQuote, type PerpSide } from "@/lib/perps";
import { getPerpPositions, preparePerpClose, preparePerpOpen } from "@/lib/perps.functions";
import { toBaseUnits } from "@/lib/wallet-actions";

const usd = (v: string | number) => `$${Number(v).toFixed(2)}`;
const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function PerpsLive({ asset }: { asset: PerpAsset }) {
  const t = useT();
  const session = useBovedaSession();
  const wallet = session.walletAddress;
  const [amount, setAmount] = useState("10");
  const [leverage, setLeverage] = useState(10);
  const [review, setReview] = useState<{ side: PerpSide; quote: PerpQuote; tx: string; fee: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; sig?: string } | null>(null);
  const [positions, setPositions] = useState<PerpPosition[]>([]);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    const r = await getPerpPositions({ data: { wallet } });
    if (r.success) setPositions(r.positions);
  }, [wallet]);
  useEffect(() => { void refresh(); const id = setInterval(refresh, 5000); return () => clearInterval(id); }, [refresh]);

  if (!wallet) return (
    <section className="rounded-2xl border border-border bg-secondary/40 p-5">
      <div className="flex items-center gap-2"><Wallet size={18} /><h2 className="font-semibold">{t("En vivo con USDC")}</h2></div>
      <p className="mt-2 text-sm text-muted-foreground">{t("Entra con tu cuenta para operar en vivo con el USDC de tu wallet.")}</p>
    </section>
  );

  const units = toBaseUnits(amount, "USDC");
  const valid = !!units && units >= BigInt(PERP_MIN_USDC * 1e6) && units <= BigInt(PERP_MAX_USDC * 1e6);
  const fee = units ? Number(perpOpenFee(units)) / 1e6 : 0;

  const prepare = async (side: PerpSide) => {
    if (!units || !valid) return;
    setBusy(side); setMsg(null); setReview(null);
    try {
      const r = await preparePerpOpen({ data: { wallet, asset, side, amount: units.toString(), leverage } });
      if (!r.success) throw new Error(r.error);
      setReview({ side, quote: r.quote, tx: r.transaction, fee: r.feeMicro });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };
  const confirm = async () => {
    if (!review) return;
    setBusy("sign");
    try {
      const sig = await session.signAndSend(b64(review.tx));
      setReview(null);
      setMsg({ ok: true, text: t("Orden enviada. Tu posición aparece en unos segundos."), sig });
      setTimeout(refresh, 4000);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };
  const close = async (p: PerpPosition) => {
    setBusy(p.positionPubkey); setMsg(null);
    try {
      const r = await preparePerpClose({ data: { wallet, position: p.positionPubkey } });
      if (!r.success) throw new Error(r.error);
      const sig = await session.signAndSend(b64(r.transaction));
      setMsg({ ok: true, text: t("Cierre enviado. Recibirás USDC en tu wallet en unos segundos."), sig });
      setTimeout(refresh, 4000);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };

  return (
    <section className="space-y-4 rounded-2xl border-2 border-primary/40 bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Wallet className="text-primary" size={18} /><h2 className="font-display text-lg font-bold">{t("En vivo con USDC")}</h2></div>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{asset}</span>
      </div>
      <p className="text-xs text-muted-foreground">{t("Abre una posición «Sube» o «Baja» con tu USDC y ciérrala cuando quieras. Las ganancias las paga un fondo de liquidez externo; puedes perder todo lo que pongas.")}</p>
      <div>
        <label htmlFor="perp-amount" className="text-sm font-semibold">{t("Monto (USDC)")}</label>
        <input id="perp-amount" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, "")); setReview(null); }} className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 font-display text-xl font-bold" />
        <div className="mt-2 grid grid-cols-4 gap-2">{[10, 25, 50, 100].map((v) => <Button key={v} type="button" variant="secondary" size="sm" onClick={() => { setAmount(String(v)); setReview(null); }}>{v}</Button>)}</div>
        {!valid && <p className="mt-2 text-xs text-destructive">{t("Entre {min} y {max} USDC por posición.", { min: PERP_MIN_USDC, max: PERP_MAX_USDC })}</p>}
      </div>
      <div>
        <div className="flex justify-between text-sm"><label htmlFor="perp-lev" className="font-semibold">{t("Multiplicador")}</label><span className="font-display font-bold">{leverage}×</span></div>
        <input id="perp-lev" type="range" min={PERP_MIN_LEVERAGE} max={PERP_MAX_LEVERAGE} value={leverage} onChange={(e) => { setLeverage(Number(e.target.value)); setReview(null); }} className="mt-2 w-full accent-primary" />
      </div>
      <p className="text-xs text-muted-foreground">{t("Comisión BÓVEDA al abrir")}: <strong className="text-foreground">{fee.toFixed(6)} USDC</strong> · {t("gratis hasta 10 USDC, 1.25% sobre el resto. Cerrar no tiene comisión de BÓVEDA.")}</p>
      <div className="grid grid-cols-2 gap-3">
        <Button disabled={!valid || !!busy} onClick={() => prepare("long")} className="h-16 rounded-2xl text-lg font-bold">{busy === "long" ? <Loader2 className="animate-spin" /> : <><ArrowUpRight />{t("Sube")}</>}</Button>
        <Button disabled={!valid || !!busy} onClick={() => prepare("short")} variant="destructive" className="h-16 rounded-2xl text-lg font-bold">{busy === "short" ? <Loader2 className="animate-spin" /> : <><ArrowDownRight />{t("Baja")}</>}</Button>
      </div>

      {review && <div className="space-y-2 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
        <p className="font-semibold">{t("Revisa tu posición")} · {asset} · {t(review.side === "long" ? "Sube" : "Baja")} · {review.quote.leverage}×</p>
        <dl className="grid grid-cols-2 gap-y-1">
          <dt className="text-muted-foreground">{t("Tamaño")}</dt><dd className="text-right">{usd(review.quote.positionSizeUsd)}</dd>
          <dt className="text-muted-foreground">{t("Garantía")}</dt><dd className="text-right">{usd(review.quote.positionCollateralSizeUsd)}</dd>
          <dt className="text-muted-foreground">{t("Precio de entrada")}</dt><dd className="text-right">{usd(review.quote.entryPriceUsd)}</dd>
          <dt className="text-muted-foreground">{t("Se liquida en")}</dt><dd className="text-right font-semibold text-destructive">{usd(review.quote.liquidationPriceUsd)}</dd>
          <dt className="text-muted-foreground">{t("Costo de apertura del mercado")}</dt><dd className="text-right">{usd(Number(review.quote.openFeeUsd) + Number(review.quote.priceImpactFeeUsd))}</dd>
          <dt className="text-muted-foreground">{t("Comisión BÓVEDA")}</dt><dd className="text-right">{(Number(review.fee) / 1e6).toFixed(6)} USDC</dd>
        </dl>
        <Button className="w-full" disabled={busy === "sign"} onClick={confirm}>{busy === "sign" ? <Loader2 className="animate-spin" /> : t("Confirmar y firmar")}</Button>
      </div>}

      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.text}{msg.sig && <> <a className="inline-flex items-center gap-1 underline" href={`https://orb.helius.dev/tx/${msg.sig}`} target="_blank" rel="noreferrer">{t("Ver recibo")}<ExternalLink size={12} /></a></>}</p>}

      {positions.length > 0 && <div className="space-y-2">
        <h3 className="font-semibold">{t("Tus posiciones en vivo")}</h3>
        {positions.map((p) => { const pnl = Number(p.pnlAfterFeesUsd); return (
          <div key={p.positionPubkey} className={`rounded-xl border-2 p-3 ${pnl >= 0 ? "border-primary/50 bg-primary/5" : "border-destructive/50 bg-destructive/5"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm"><p className="font-semibold">{p.asset} · {t(p.side === "long" ? "Sube" : "Baja")} · {Number(p.leverage).toFixed(1)}×</p><p className="text-xs text-muted-foreground">{t("Entrada")} {usd(p.entryPriceUsd)} · {t("Actual")} {usd(p.markPriceUsd)} · {t("Se liquida en")} {usd(p.liquidationPriceUsd)}</p></div>
              <div className="text-right"><p className={`font-display text-lg font-bold ${pnl >= 0 ? "text-primary" : "text-destructive"}`}>{pnl >= 0 ? "+" : ""}{usd(pnl)}</p><p className="text-xs text-muted-foreground">{Number(p.pnlAfterFeesPct).toFixed(2)}%</p></div>
            </div>
            <Button size="sm" variant="secondary" className="mt-2 w-full" disabled={!!busy} onClick={() => close(p)}>{busy === p.positionPubkey ? <Loader2 className="animate-spin" /> : t("Cerrar y recibir USDC")}</Button>
          </div>); })}
      </div>}
    </section>
  );
}
