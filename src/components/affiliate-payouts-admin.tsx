import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { AFFILIATE_PAYOUT_WALLET, type PayoutDue } from "@/lib/affiliate";
import { listAffiliatePayouts, markAffiliatePaid, verifyWalletOwnership, walletIsVerified } from "@/lib/affiliate.functions";
import { walletProofMessage } from "@/lib/wallet-proof";
import { buildTransfer, readTokenBalance, USDC_MINT } from "@/lib/wallet-actions";

const usdc = (raw: string | bigint) => (Number(raw) / 1e6).toFixed(2);
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

/** Operator-only: visible only while the dedicated payout wallet is connected. Each payout is one wallet-signed USDC transfer, verified on-chain before marking paid. */
export function AffiliatePayoutsAdmin() {
  const t = useT();
  const session = useBovedaSession();
  const list = useServerFn(listAffiliatePayouts);
  const mark = useServerFn(markAffiliatePaid);
  const isVerified = useServerFn(walletIsVerified);
  const verify = useServerFn(verifyWalletOwnership);
  const [due, setDue] = useState<PayoutDue[] | null>(null);
  const [paid, setPaid] = useState("0");
  const [balance, setBalance] = useState<bigint | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (session.walletAddress !== AFFILIATE_PAYOUT_WALLET) return null;

  async function token() { const v = await session.getAccessToken?.(); if (!v) throw new Error(); return v; }
  async function open() {
    setBusy("load"); setMsg(null);
    try {
      const tk = await token();
      if (!(await isVerified({ data: { token: tk, wallet: AFFILIATE_PAYOUT_WALLET } })).verified) {
        if (!session.signMessage || !session.userId) throw new Error();
        const issuedAt = new Date().toISOString();
        const signature = await session.signMessage(walletProofMessage(session.userId, AFFILIATE_PAYOUT_WALLET, issuedAt));
        if (!(await verify({ data: { token: tk, wallet: AFFILIATE_PAYOUT_WALLET, issuedAt, signature } })).success) { setMsg(t("No se pudo verificar la wallet de pagos.")); return; }
      }
      const r = await list({ data: { token: tk } });
      if (!r.success) { setMsg(t(r.error)); return; }
      setDue(r.due); setPaid(r.paidRaw);
      setBalance(await readTokenBalance(AFFILIATE_PAYOUT_WALLET, USDC_MINT).catch(() => null));
    } catch { setMsg(t("No se pudo abrir el panel de pagos.")); } finally { setBusy(null); }
  }
  async function pay(d: PayoutDue) {
    if (!d.wallet || busy) return;
    setBusy(d.affiliate); setMsg(null);
    try {
      const tx = await buildTransfer({ from: AFFILIATE_PAYOUT_WALLET, to: d.wallet, asset: "USDC", amount: BigInt(d.pendingRaw) });
      const signature = await session.signAndSend(tx);
      const r = await mark({ data: { token: await token(), affiliate: d.affiliate, signature } });
      setMsg(r.success ? t("Pago enviado y registrado.") : t(r.error));
      await open();
    } catch { setMsg(t("Pago cancelado o fallido. No se marcó como pagado.")); } finally { setBusy(null); }
  }
  const total = (due ?? []).reduce((a, d) => a + BigInt(d.pendingRaw), 0n);
  return <section className="mt-10 rounded-2xl border border-primary/40 bg-primary/5 p-5" aria-labelledby="payouts-title">
    <h2 id="payouts-title" className="flex items-center gap-2 font-display text-xl font-semibold"><ShieldCheck size={18} />{t("Pagos de afiliados (operador)")}</h2>
    <p className="mt-1 text-xs text-muted-foreground">{t("Wallet de pagos")}: <span className="font-mono">{short(AFFILIATE_PAYOUT_WALLET)}</span></p>
    {!due ? <Button className="mt-4" onClick={() => void open()} disabled={!!busy}>{busy === "load" ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}{t("Abrir panel de pagos")}</Button> : <>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl border border-border bg-card p-3"><dt className="text-xs text-muted-foreground">{t("Saldo disponible")}</dt><dd className="font-semibold">{balance === null ? "—" : usdc(balance)} USDC</dd></div>
        <div className="rounded-xl border border-border bg-card p-3"><dt className="text-xs text-muted-foreground">{t("Por pagar")}</dt><dd className="font-semibold">{usdc(total)} USDC</dd></div>
        <div className="rounded-xl border border-border bg-card p-3"><dt className="text-xs text-muted-foreground">{t("Pagado")}</dt><dd className="font-semibold">{usdc(paid)} USDC</dd></div>
      </dl>
      {balance !== null && balance < total && <p className="mt-3 text-xs text-destructive">{t("Fondea la wallet de pagos con USDC desde la tesorería antes de pagar a todos.")}</p>}
      {due.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{t("No hay afiliados con 10 USDC o más pendientes.")}</p> :
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">{due.map((d) => <li key={d.affiliate} className="flex items-center gap-3 px-3 py-3 text-sm">
          <div className="min-w-0 flex-1"><p className="font-semibold">{d.code}</p><p className="font-mono text-xs text-muted-foreground">{d.wallet ? short(d.wallet) : t("Sin wallet de cobro")} · {d.count} {t("comisiones")}</p></div>
          <Button size="sm" disabled={!d.wallet || !!busy || (balance !== null && balance < BigInt(d.pendingRaw))} onClick={() => void pay(d)}>{busy === d.affiliate ? <Loader2 size={14} className="animate-spin" /> : `${t("Pagar")} ${usdc(d.pendingRaw)}`}</Button>
        </li>)}</ul>}
      <p className="mt-3 text-xs text-muted-foreground">{t("Cada pago es una transferencia USDC que firmas tú. Solo se marca como pagado cuando la red la confirma por el total adeudado. Mantén un poco de SOL para costes de red.")}</p>
    </>}
    {msg && <p role="status" className="mt-3 text-sm">{msg}</p>}
  </section>;
}
