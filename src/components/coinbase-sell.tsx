import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ExternalLink, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";
import { useT } from "@/lib/i18n";
import { solanaAddressSchema } from "@/lib/solana-data";
import { USDC_MINT, buildTransfer, readTokenBalance, toBaseUnits } from "@/lib/wallet-actions";
import { withdrawFee } from "@/lib/fees";
import { coinbaseSellStatus, startCoinbaseSell } from "@/lib/coinbase-offramp.functions";

type Sell = { id: string; toAddress: string; amount: string; fiat: string | null };
const fmt = (v: bigint) => (Number(v) / 1e6).toFixed(2);

/** Coinbase-hosted sell: user picks bank/card at Coinbase, then signs one USDC transfer (+1% fee) to Coinbase's deposit address. */
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
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  useEffect(() => { readTokenBalance(wallet, USDC_MINT).then(setBalance).catch(() => setBalance(null)); }, [wallet, sig]);

  async function open() {
    setError(null); setPhase("opening");
    const popup = window.open("", "_blank");
    const r = await startFn({ data: { wallet, origin: window.location.origin } });
    if (!r.success) { popup?.close(); setError(t(r.error)); setPhase("idle"); return; }
    if (popup) popup.location.href = r.url; else window.location.href = r.url;
    setPhase("waiting");
    let n = 0;
    timer.current = window.setInterval(async () => {
      if (++n > 120) { window.clearInterval(timer.current!); setPhase("idle"); return; }
      const s = await statusFn().catch(() => null);
      if (s?.success && s.sell && solanaAddressSchema.safeParse(s.sell.toAddress).success && toBaseUnits(s.sell.amount, "USDC")) { window.clearInterval(timer.current!); setSell(s.sell); setPhase("ready"); }
    }, 5000);
  }

  const units = sell ? toBaseUnits(sell.amount, "USDC") : null;
  const fee = units ? withdrawFee(units) : 0n;
  const total = units ? units + fee : 0n;
  const short = balance != null && total > balance;

  async function send() {
    if (!sell || !units) return;
    setPhase("sending"); setError(null);
    try { const s = await signAndSend(await buildTransfer({ from: wallet, to: sell.toAddress, asset: "USDC", amount: units, fee })); setSig(s); setPhase("done"); if (fee > 0n) void reportAffiliate(s, "withdraw"); }
    catch (e) { setError(e instanceof Error ? e.message : t("No se pudo completar la operación.")); setPhase("ready"); }
  }

  if (phase === "done" && sig) return <div role="status" className="grid gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={16} />{t("¡Listo! Coinbase enviará el dinero a tu banco o tarjeta.")}</p><a className="text-xs underline" href={`https://orbmarkets.io/tx/${sig}`} target="_blank" rel="noopener noreferrer">{t("Ver comprobante")}</a></div>;

  if ((phase === "ready" || phase === "sending") && sell && units) return <div className="grid gap-3">
    <div className="grid gap-1 rounded-lg border p-3 text-xs">
      <div className="flex justify-between"><span>{t("Vendes en Coinbase")}</span><span>{fmt(units)} USDC</span></div>
      <div className="flex justify-between"><span>{t("Comisión de BÓVEDA (1%)")}</span><span>{fmt(fee)} USDC</span></div>
      <div className="flex justify-between"><span>{t("Costo de red")}</span><span>{"< $0.01"}</span></div>
      <div className="flex justify-between text-sm"><span>{t("Sale de tu wallet")}</span><b>{fmt(total)} USDC</b></div>
      {sell.fiat && <div className="flex justify-between text-sm"><span>{t("Recibes en tu banco")}</span><b>{sell.fiat}</b></div>}
    </div>
    {short && <p className="text-xs text-destructive">{t("Saldo insuficiente")}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button disabled={short || phase === "sending"} onClick={() => void send()}>{phase === "sending" ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}{phase === "sending" ? t("Firma en tu wallet…") : t("Confirmar retiro")}</Button>
  </div>;

  return <div className="grid gap-2">
    <Button onClick={() => void open()} disabled={phase === "opening" || phase === "waiting"}>{phase === "idle" ? <ExternalLink size={16} /> : <LoaderCircle className="animate-spin" size={16} />}{phase === "waiting" ? t("Termina en Coinbase y vuelve aquí…") : t("Retirar a mi banco con Coinbase")}</Button>
    <p className="text-xs text-muted-foreground">{t("Elige tu banco o tarjeta y el monto en Coinbase. Vuelve a BÓVEDA y confirma con un toque. Sin copiar ni pegar direcciones.")}</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
