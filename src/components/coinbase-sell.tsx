import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ExternalLink, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";
import { useT } from "@/lib/i18n";
import { solanaAddressSchema } from "@/lib/solana-data";
import { USDC_MINT, buildTransfer, readTokenBalance, toBaseUnits } from "@/lib/wallet-actions";
import { tierPercent, withdrawFee } from "@/lib/fees";
import { holdSessionForExternalFlow } from "@/components/idle-logout";
import { coinbaseSellStatus, startCoinbaseSell } from "@/lib/coinbase-offramp.functions";

export const SELL_FLAG = "boveda:cb-sell-pending";
export const sellFlagActive = () => { try { const v = Number(localStorage.getItem(SELL_FLAG)); return v > 0 && Date.now() - v < 15 * 60_000; } catch { return false; } };
const clearSellFlag = () => { try { localStorage.removeItem(SELL_FLAG); } catch { /* ignore */ } };
const DISMISSED_KEY = "boveda:cb-sell-dismissed";
const readDismissed = (): string[] => { try { const v = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(-20) : []; } catch { return []; } };
const addDismissed = (id: string) => { try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...readDismissed().filter((x) => x !== id), id].slice(-20))); } catch { /* ignore */ } };
type Sell = { id: string; toAddress: string; amount: string; fiat: string | null };
const fmt = (v: bigint) => (Number(v) / 1e6).toFixed(2);

/** Coinbase-hosted sell: user picks bank/card at Coinbase, then signs one USDC transfer (+tiered fee) to Coinbase's deposit address. */
export function CoinbaseSell({ wallet }: { wallet: string }) {
  const t = useT();
  const { signAndSend } = useBovedaSession();
  const reportAffiliate = useAffiliateReport();
  const startFn = useServerFn(startCoinbaseSell);
  const statusFn = useServerFn(coinbaseSellStatus);
  const [phase, setPhase] = useState<"idle" | "opening" | "waiting" | "ready" | "sending" | "done">("idle");
  const [sell, setSell] = useState<Sell | null>(null);
  const [sig, setSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const timer = useRef<number | null>(null);
  const release = useRef<(() => void) | null>(null);
  const hold = () => { release.current?.(); release.current = holdSessionForExternalFlow(); };
  const unhold = () => { release.current?.(); release.current = null; };
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); release.current?.(); }, []);
  const dismissed = useRef<string | null>(null);
  const autoSign = useRef<string | null>(null);
  const phaseRef = useRef(phase); phaseRef.current = phase;
  async function check() {
    if (phaseRef.current !== "idle" && phaseRef.current !== "waiting") return false;
    const s = await statusFn().catch(() => null);
    if (s?.success && s.sell && s.sell.id !== dismissed.current && !readDismissed().includes(s.sell.id) && solanaAddressSchema.safeParse(s.sell.toAddress).success && toBaseUnits(s.sell.amount, "USDC")) {
      if (timer.current) window.clearInterval(timer.current);
      setSell(s.sell); setPhase("ready"); autoSign.current = s.sell.id; return true;
    }
    return false;
  }
  useEffect(() => {
    // Coinbase may take a few seconds to register the order after redirect: retry briefly.
    let tries = 0; let stop = false;
    const poll = async () => { if (stop || ++tries > 8) return; if (!(await check()) && sellFlagActive()) window.setTimeout(poll, 3000); };
    void poll();
    const onBack = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onBack); window.addEventListener("focus", onBack);
    return () => { document.removeEventListener("visibilitychange", onBack); window.removeEventListener("focus", onBack); stop = true; };
  }, []);
  useEffect(() => { readTokenBalance(wallet, USDC_MINT).then(setBalance).catch(() => setBalance(null)); }, [wallet, sig]);

  async function open() {
    setError(null); setPhase("opening");
    try { localStorage.setItem(SELL_FLAG, String(Date.now())); } catch { /* ignore */ }
    const popup = window.open("", "_blank");
    hold();
    const r = await startFn({ data: { wallet, origin: window.location.origin } });
    if (!r.success) { popup?.close(); unhold(); setError(t(r.error)); setPhase("idle"); return; }
    if (popup) popup.location.href = r.url; else window.location.href = r.url;
    setPhase("waiting");
    let n = 0;
    timer.current = window.setInterval(async () => {
      if (++n > 120) { window.clearInterval(timer.current!); unhold(); setPhase("idle"); return; }
      await check();
    }, 5000);
  }

  const units = sell ? toBaseUnits(sell.amount, "USDC") : null;
  const fee = units ? withdrawFee(units) : 0n;
  const total = units ? units + fee : 0n;
  const short = balance != null && total > balance;

  async function send() {
    if (!sell || !units) return;
    setPhase("sending"); setError(null);
    try { const s = await signAndSend(await buildTransfer({ from: wallet, to: sell.toAddress, asset: "USDC", amount: units, fee })); setSig(s); setPhase("done"); clearSellFlag(); unhold(); if (fee > 0n) void reportAffiliate(s, "withdraw"); }
    catch (e) { setError(e instanceof Error ? e.message : t("No se pudo completar la operación.")); setPhase("ready"); }
  }

  // Pop the wallet signature automatically once per pending sell (review details stay visible).
  useEffect(() => {
    if (phase === "ready" && sell && units && !short && balance != null && autoSign.current === sell.id) { autoSign.current = null; void send(); }
  }, [phase, sell, balance]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "done" && sig) return <div role="status" className="grid gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={16} />{t("¡Listo! El dinero llegará a tu saldo de Coinbase.")}</p><a className="text-xs underline" href={`https://orbmarkets.io/tx/${sig}`} target="_blank" rel="noopener noreferrer">{t("Ver comprobante")}</a></div>;

  if ((phase === "ready" || phase === "sending") && sell && units) return <div className="grid gap-3">
    <div className="grid gap-1 rounded-lg border p-3 text-xs">
      <div className="flex justify-between"><span>{t("Vendes en Coinbase")}</span><span>{fmt(units)} USDC</span></div>
      <div className="flex justify-between"><span>{t("Comisión de BÓVEDA ({p}%)", { p: String(tierPercent(units || 0n, "withdraw")) })}</span><span>{fmt(fee)} USDC</span></div>
      <div className="flex justify-between"><span>{t("Costo de red")}</span><span>{"< $0.01"}</span></div>
      <div className="flex justify-between text-sm"><span>{t("Sale de tu wallet")}</span><b>{fmt(total)} USDC</b></div>
      {sell.fiat && <div className="flex justify-between text-sm"><span>{t("Recibes en tu saldo de Coinbase")}</span><b>{sell.fiat}</b></div>}
    </div>
    {short && <p className="text-xs text-muted-foreground">{t("Saldo disponible insuficiente para esta cantidad")}</p>}
    {error && <p role="alert" className="text-sm text-muted-foreground">{error}</p>}
    <Button disabled={short || phase === "sending"} onClick={() => void send()}>{phase === "sending" ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}{phase === "sending" ? t("Firma en tu wallet…") : t("Confirmar retiro")}</Button>
    <Button variant="ghost" size="sm" disabled={phase === "sending"} onClick={() => { dismissed.current = sell.id; addDismissed(sell.id); autoSign.current = null; if (timer.current) window.clearInterval(timer.current); clearSellFlag(); setSell(null); setError(null); setPhase("idle"); unhold(); }}>{t("Descartar y empezar de nuevo")}</Button>
  </div>;

  return <div className="grid gap-2">
    <Button onClick={() => void open()} disabled={phase === "opening" || phase === "waiting"}>{phase === "idle" ? <ExternalLink size={16} /> : <LoaderCircle className="animate-spin" size={16} />}{phase === "waiting" ? t("Termina en Coinbase y vuelve aquí…") : t("Retirar a mi saldo de Coinbase")}</Button>
    <p className="text-xs text-muted-foreground">{t("Tu saldo de Coinbase ya viene elegido: el dinero queda disponible al instante. Vuelve a BÓVEDA y confirma con un toque.")}</p>
    {error && <p role="alert" className="text-sm text-muted-foreground">{error}</p>}
  </div>;
}
