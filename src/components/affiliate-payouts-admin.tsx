import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { AFFILIATE_PAYOUT_WALLET, type PayoutDue, type PayoutRecent } from "@/lib/affiliate";
import { listAffiliatePayouts, markAffiliatePaid, verifyWalletOwnership, walletIsVerified } from "@/lib/affiliate.functions";
import { walletProofMessage } from "@/lib/wallet-proof";
import { buildTransfer, readTokenBalance, SOL_MINT, USDC_MINT } from "@/lib/wallet-actions";

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
  const [sol, setSol] = useState<bigint | null>(null);
  const [pendingAll, setPendingAll] = useState("0");
  const [recent, setRecent] = useState<PayoutRecent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const isOperator = session.walletAddress === AFFILIATE_PAYOUT_WALLET;
  useEffect(() => { if (isOperator && window.location.hash === "#tesoreria") setTimeout(() => document.getElementById("tesoreria")?.scrollIntoView({ behavior: "smooth" }), 400); }, [isOperator]);
  if (!isOperator) return null;

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
      setDue(r.due); setPaid(r.paidRaw); setPendingAll(r.pendingAllRaw); setRecent(r.recent);
      const [u, s] = await Promise.all([readTokenBalance(AFFILIATE_PAYOUT_WALLET, USDC_MINT).catch(() => null), readTokenBalance(AFFILIATE_PAYOUT_WALLET, SOL_MINT).catch(() => null)]);
      setBalance(u); setSol(s);
    } catch { setMsg(t("No se pudo abrir el panel de pagos.")); } finally { setBusy(null); }
  }
  async function pay(d: PayoutDue) {
    if (!d.wallet || busy) return;
    setBusy(d.affiliate); setMsg(null);
    try {
      const tx = await buildTransfer({ from: AFFILIATE_PAYOUT_WALLET, to: d.wallet, asset: "USDC", amount: BigInt(d.pendingRaw) });
      const signature = await (session.signAndSendAdmin ?? session.signAndSend)(tx);
      const r = await mark({ data: { token: await token(), affiliate: d.affiliate, signature } });
      setMsg(r.success ? t("Pago enviado y registrado.") : t(r.error));
      await open();
    } catch { setMsg(t("Pago cancelado o fallido. No se marcó como pagado.")); } finally { setBusy(null); }
  }
  const total = (due ?? []).reduce((a, d) => a + BigInt(d.pendingRaw), 0n);
  return <section id="tesoreria" className="mt-10 scroll-mt-20 rounded-2xl border border-primary/40 bg-primary/5 p-5" aria-labelledby="payouts-title">
    <h2 id="payouts-title" className="flex items-center gap-2 font-display text-xl font-semibold"><ShieldCheck size={18} />{t("Tesorería Bóveda Market (operador)")}</h2>
    <p className="mt-1 text-xs text-muted-foreground">{t("Wallet de tesorería")}: <span className="font-mono">{short(AFFILIATE_PAYOUT_WALLET)}</span></p>
    {!due ? <Button className="mt-4" onClick={() => void open()} disabled={!!busy}>{busy === "load" ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}{t("Abrir panel de tesorería")}</Button> : <>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3"><dt className="text-xs text-muted-foreground">{t("Saldo USDC en wallet")}</dt><dd className="font-semibold">{balance === null ? "—" : usdc(balance)} USDC</dd></div>
        <div className="rounded-xl border border-border bg-card p-3"><dt className="text-xs text-muted-foreground">{t("Reservado para afiliados")}</dt><dd className="font-semibold">{usdc(pendingAll)} USDC</dd></div>
        <div className="rounded-xl border border-primary/50 bg-card p-3"><dt className="text-xs text-muted-foreground">{t("Profit disponible")}</dt><dd className="font-semibold text-primary">{balance === null ? "—" : usdc(balance > BigInt(pendingAll) ? balance - BigInt(pendingAll) : 0n)} USDC</dd></div>
        <div className="rounded-xl border border-border bg-card p-3"><dt className="text-xs text-muted-foreground">{t("Listo para cobrar (≥10)")}</dt><dd className="font-semibold">{usdc(total)} USDC</dd></div>
        <div className="rounded-xl border border-border bg-card p-3"><dt className="text-xs text-muted-foreground">{t("Pagado a afiliados")}</dt><dd className="font-semibold">{usdc(paid)} USDC</dd></div>
        <div className="rounded-xl border border-border bg-card p-3"><dt className="text-xs text-muted-foreground">{t("SOL para red")}</dt><dd className={`font-semibold ${sol !== null && sol < 3_000_000n ? "text-destructive" : ""}`}>{sol === null ? "—" : (Number(sol) / 1e9).toFixed(4)} SOL</dd></div>
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">{t("Profit disponible = saldo USDC menos lo reservado para afiliados. Puedes retirarlo sin dejar a nadie sin cobrar.")}</p>
      {balance !== null && balance < BigInt(pendingAll) && <p className="mt-2 text-xs text-destructive">{t("El saldo USDC no cubre todo lo reservado para afiliados.")}</p>}
      {due.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{t("No hay afiliados con 3 USDC o más pendientes.")}</p> :
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">{due.map((d) => <li key={d.affiliate} className="flex items-center gap-3 px-3 py-3 text-sm">
          <div className="min-w-0 flex-1"><p className="font-semibold">{d.code}</p><p className="font-mono text-xs text-muted-foreground">{d.wallet ? short(d.wallet) : t("Sin wallet de cobro")} · {d.count} {t("ganancias")}</p></div>
          <Button size="sm" disabled={!d.wallet || !!busy || (balance !== null && balance < BigInt(d.pendingRaw))} onClick={() => void pay(d)}>{busy === d.affiliate ? <Loader2 size={14} className="animate-spin" /> : `${t("Pagar")} ${usdc(d.pendingRaw)}`}</Button>
        </li>)}</ul>}
      {recent.length > 0 && <><h3 className="mt-5 text-sm font-semibold">{t("Últimos pagos")}</h3><ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card text-sm">{recent.map((r) => <li key={r.signature} className="flex items-center gap-3 px-3 py-2"><div className="min-w-0 flex-1"><p className="font-semibold">{r.code} · {usdc(r.amountRaw)} USDC</p><p className="truncate font-mono text-xs text-muted-foreground">{r.paidAt ? new Date(r.paidAt).toLocaleString() : ""} · {short(r.signature)}</p></div><a className="text-xs text-primary underline" href={`https://solscan.io/tx/${r.signature}`} target="_blank" rel="noreferrer">{t("Ver")}</a></li>)}</ul></>}
      <p className="mt-3 text-xs text-muted-foreground">{t("Cada pago es una transferencia USDC que firmas tú. Solo se marca como pagado cuando la red la confirma por el total adeudado. Mantén un poco de SOL para costes de red.")}</p>
    </>}
    {msg && <p role="status" className="mt-3 text-sm">{msg}</p>}
  </section>;
}
