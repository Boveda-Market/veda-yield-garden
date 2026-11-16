import { TapAmount } from "@/components/ui/tap-amount";
import { useEffect, useState } from "react";
import { Bitcoin, CheckCircle2, LoaderCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { tierPercent, withdrawFee } from "@/lib/fees";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";
import { useT } from "@/lib/i18n";
import { BTC_OFFRAMP_MAX_USDC, BTC_OFFRAMP_MIN_USDC, amountAllowed, isBtcAddress, providerCost } from "@/lib/btc-offramp";
import { btcWithdrawStatus, createBtcWithdraw, quoteBtcWithdraw } from "@/lib/btc-offramp.functions";
import { USDC_MINT, buildTransfer, readTokenBalance, toBaseUnits } from "@/lib/wallet-actions";

type Quote = Awaited<ReturnType<typeof quoteBtcWithdraw>>;

/** Cash App: swap USDC to native Bitcoin via provider and deliver to the user's Cash App BTC address. One wallet signature. */
export function CashAppBtc({ wallet }: { wallet: string }) {
  const t = useT();
  const { signAndSend } = useBovedaSession();
  const reportAffiliate = useAffiliateReport();
  const quoteFn = useServerFn(quoteBtcWithdraw);
  const createFn = useServerFn(createBtcWithdraw);
  const statusFn = useServerFn(btcWithdrawStatus);
  const [addr, setAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ sig: string; shiftId: string; btc: string } | null>(null);
  const [status, setStatus] = useState<string>("waiting");
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => { readTokenBalance(wallet, USDC_MINT).then((b) => setBalance(Number(b) / 1e6)).catch(() => setBalance(null)); }, [wallet, done]);
  const pick = (f: number) => { if (balance == null) return; setAmount((Math.floor(balance * f * 100) / 100).toFixed(2)); };

  const n = Number(amount);
  const amountOk = amountAllowed(n);
  const addrOk = isBtcAddress(addr);
  const grossUnits = /^\d+(\.\d{1,6})?$/.test(amount) ? toBaseUnits(amount, "USDC") : null;
  const feeUnits = grossUnits ? withdrawFee(grossUnits) : 0n;
  const netAmount = grossUnits ? (Number(grossUnits - feeUnits) / 1e6).toFixed(6) : "";

  useEffect(() => {
    setQuote(null); setError(null);
    if (!amountOk || !/^\d+(\.\d{1,6})?$/.test(amount)) return;
    let alive = true;
    const run = () => { setQuoting(true); quoteFn({ data: { amount: netAmount } }).then((q) => { if (alive) setQuote(q); }).catch((e) => { if (alive) setError(e instanceof Error ? e.message : String(e)); }).finally(() => { if (alive) setQuoting(false); }); };
    const h = setTimeout(run, 500); const r = setInterval(run, 60_000);
    return () => { alive = false; clearTimeout(h); clearInterval(r); };
  }, [amount, amountOk, netAmount, quoteFn]);

  useEffect(() => {
    if (!done || status === "settled" || status === "refunded") return;
    const i = setInterval(() => { statusFn({ data: { shiftId: done.shiftId } }).then((s) => setStatus(s.status)).catch(() => {}); }, 20_000);
    return () => clearInterval(i);
  }, [done, status, statusFn]);

  const cost = quote ? providerCost(Number(quote.depositAmount), Number(quote.settleAmount), quote.usdcPerBtc) : null;
  const canSend = !!quote && addrOk && checked && !busy && (balance == null || n <= balance);

  async function send() {
    if (!quote || !canSend) return;
    setBusy(true); setError(null);
    try {
      const shift = await createFn({ data: { quoteId: quote.quoteId, btcAddress: addr.trim(), wallet } });
      if (shift.depositAmount !== quote.depositAmount) throw new Error(t("La cotización cambió. Revisa de nuevo."));
      const units = toBaseUnits(shift.depositAmount, "USDC");
      if (!units) throw new Error(t("Monto no válido"));
      const sig = await signAndSend(await buildTransfer({ from: wallet, to: shift.depositAddress, asset: "USDC", amount: units, fee: feeUnits }));
      if (feeUnits > 0n) void reportAffiliate(sig, "withdraw");
      setDone({ sig, shiftId: shift.shiftId, btc: shift.settleAmount }); setStatus("waiting");
    } catch (e) { setError(e instanceof Error ? e.message : t("No se pudo completar la operación.")); }
    finally { setBusy(false); }
  }

  if (done) {
    const label = status === "settled" ? t("¡Listo! El Bitcoin ya fue enviado a tu Cash App.") : status === "refunded" ? t("El proveedor devolvió tus USDC a tu wallet.") : t("USDC enviados. Tu Bitcoin llegará a Cash App en unos 15 a 30 minutos.");
    return <div role="status" className="grid gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold">{status === "settled" ? <CheckCircle2 size={16} /> : <LoaderCircle size={16} className="animate-spin" />}{label}</p>
      <p className="text-xs">{t("Recibirás")} ≈ {done.btc} BTC</p>
      <a className="text-xs underline" href={`https://orbmarkets.io/tx/${done.sig}`} target="_blank" rel="noopener noreferrer">{t("Ver comprobante")}</a>
      <Button size="sm" variant="outline" onClick={() => { setDone(null); setAmount(""); setChecked(false); }}>{t("Hacer otro retiro")}</Button>
    </div>;
  }

  return <div className="grid gap-3">
    <p className="text-xs text-muted-foreground">{t("Convertimos tus USDC a Bitcoin y lo enviamos directo a tu Cash App. Solo firmas una vez.")}</p>
    <div className="grid gap-1 text-sm"><span className="font-medium">{t("Cantidad ($)")}</span><TapAmount label={t("Cantidad ($)")} prefix="$" value={amount} disabled={busy} onChange={(v) => setAmount(v.replace(",", ".").replace(/[^\d.]/g, ""))} /></div>
    <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{t("Disponible")}: {balance == null ? "…" : `${balance.toFixed(2)} USDC`}</span></div>
    <div className="grid grid-cols-4 gap-2">{[[0.25,"25%"],[0.5,"50%"],[0.75,"75%"],[1,t("Máx")]].map(([f,l]) => <Button key={String(l)} type="button" size="sm" variant="outline" disabled={busy || !balance} onClick={() => pick(f as number)}>{l}</Button>)}</div>
    {amount && !amountOk && <p className="text-xs text-destructive">{t("Mínimo")} {BTC_OFFRAMP_MIN_USDC} USDC · {t("Máximo")} {BTC_OFFRAMP_MAX_USDC} USDC</p>}
    {balance != null && n > balance && <p className="text-xs text-destructive">{t("Saldo insuficiente")}</p>}
    {quoting && !quote && <p className="flex items-center gap-2 text-xs"><LoaderCircle size={14} className="animate-spin" />{t("Cotizando…")}</p>}
    {quote && cost && <div className="grid gap-1 rounded-lg border p-3 text-sm">
      <div className="flex justify-between"><span>{t("Envías")}</span><b>{(Number(quote.depositAmount) + Number(feeUnits) / 1e6).toFixed(2)} USDC</b></div>
      <div className="flex justify-between"><span>{t("Llega a Cash App")}</span><b className="flex items-center gap-1"><Bitcoin size={14} />{quote.settleAmount} BTC</b></div>
      <div className="flex justify-between text-xs text-muted-foreground"><span>{t("Valor aproximado")}</span><span>≈ ${cost.value.toFixed(2)}</span></div>
      <div className="flex justify-between text-xs"><span>{t("Costo del cambio y red Bitcoin")}</span><span>≈ ${cost.cost.toFixed(2)} ({cost.pct.toFixed(1)}%)</span></div>
      <div className="flex justify-between text-xs"><span>{t("Comisión de BÓVEDA ({p}%)", { p: String(tierPercent(grossUnits || 0n, "withdraw")) })}</span><span>${(Number(feeUnits) / 1e6).toFixed(2)}</span></div>
      <p className="pt-1 text-xs text-muted-foreground">{t("El precio queda fijo unos minutos. Tarda de 15 a 30 minutos por las confirmaciones de Bitcoin. Si algo falla, el proveedor devuelve tus USDC a tu wallet.")}</p>
    </div>}
    <label className="grid gap-1 text-sm"><span className="font-medium">{t("Dirección de Bitcoin de tu Cash App")}</span><Input value={addr} onChange={(e) => setAddr(e.target.value.trim())} placeholder="bc1q…" disabled={busy} autoComplete="off" spellCheck={false} /></label>
    <p className="text-xs text-muted-foreground">{t("En Cash App: Dinero → Bitcoin → Depositar bitcoin. Copia la dirección (no uses Lightning).")}</p>
    {addr && !addrOk && <p className="text-xs text-destructive">{t("Esa no es una dirección de Bitcoin válida.")}</p>}
    <label className="flex items-start gap-2 text-xs leading-5"><Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} disabled={busy} /><span>{t("Revisé que es mi dirección de Bitcoin de Cash App. Si es incorrecta, el dinero no se puede recuperar.")}</span></label>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button disabled={!canSend} onClick={() => void send()}>{busy ? <LoaderCircle className="animate-spin" size={16} /> : <Bitcoin size={16} />}{busy ? t("Firma en tu wallet…") : t("Enviar a Cash App")}</Button>
    <p className="text-xs text-muted-foreground">{t("El cambio a Bitcoin lo hace SideShift, un servicio externo. El mínimo de")} {BTC_OFFRAMP_MIN_USDC} {t("USDC evita que el costo fijo de la red Bitcoin se coma tu retiro.")}</p>
  </div>;
}
