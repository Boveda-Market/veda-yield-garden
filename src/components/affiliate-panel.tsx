import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { InviteHero } from "@/components/invite-share";
import { AffiliateHow } from "@/components/affiliate-how";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { AFFILIATE_SHARE_BPS, SUB_AFFILIATE_SHARE_BPS, PAYOUT_MIN_MICRO, payoutProgress, REF_STORAGE_KEY, normalizeCode, type AffiliateDashboard } from "@/lib/affiliate";
import { cancelAffiliateClaim, finalizeAffiliateClaim, claimAffiliatePayout, customizeAffiliateCode, getAffiliateDashboard, joinAffiliate, savePayoutWallet } from "@/lib/affiliate.functions";

const usdc = (raw: string) => (Number(raw) / 1e6).toLocaleString("en-US", { useGrouping: false,  minimumFractionDigits: 2, maximumFractionDigits: 6 });
const field = "mt-2 w-full rounded-lg border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";

export function AffiliatePanel() {
  const t = useT();
  const session = useBovedaSession();
  const load = useServerFn(getAffiliateDashboard);
  const join = useServerFn(joinAffiliate);
  const saveCode = useServerFn(customizeAffiliateCode);
  const savePayout = useServerFn(savePayoutWallet);
  const claim = useServerFn(claimAffiliatePayout);
  const finalize = useServerFn(finalizeAffiliateClaim);
  const cancel = useServerFn(cancelAffiliateClaim);
  async function collect(): Promise<{ success: boolean; error?: string }> {
    if (!dash?.payoutWallet || session.walletAddress !== dash.payoutWallet) return { success: false, error: "Conecta la wallet donde cobras tus ganancias para firmar el cobro." };
    const prepared = await claim({ data: { token: await token() } });
    if (!prepared.success) return prepared;
    let signature: string;
    try { signature = await session.signAndSend(Uint8Array.from(atob(prepared.transaction), (c) => c.charCodeAt(0))); }
    catch (e) { try { await cancel({ data: { token: await token() } }); } catch { /* lock expires */ } return { success: false, error: e instanceof Error ? e.message : "No se pudo firmar." }; }
    return finalize({ data: { token: await token(), signature } });
  }
  const [dash, setDash] = useState<AffiliateDashboard | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [, setCustomCode] = useState("");
  const [payout, setPayout] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingPayout, setEditingPayout] = useState(false);

  async function token() { const value = await session.getAccessToken?.(); if (!value) throw new Error(); return value; }
  async function refresh() {
    try {
      const result = await load({ data: { token: await token() } });
      if (result.success) {
        // Default payout destination: the connected wallet, saved once so payouts have an address.
        if (!result.dashboard.payoutWallet && session.walletAddress) {
          try { const saved = await savePayout({ data: { token: await token(), wallet: session.walletAddress } }); if (saved.success) result.dashboard.payoutWallet = session.walletAddress; } catch { /* keep UI default */ }
        }
        setDash(result.dashboard); setCustomCode(result.dashboard.code); setPayout(result.dashboard.payoutWallet ?? session.walletAddress ?? ""); } else setMessage(t(result.error));
    } catch { setMessage(t("Inicia sesión para ver tu programa de afiliados.")); }
  }
  async function act(fn: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    if (busy) return; setBusy(true); setMessage(null);
    try { const r = await fn(); setMessage(r.success ? t(ok) : t(r.error ?? "No se pudo completar.")); if (r.success) await refresh(); }
    catch { setMessage(t("No se pudo completar.")); } finally { setBusy(false); }
  }
  useEffect(() => {
    if (!session.authenticated) return;
    void (async () => {
      const stored = normalizeCode(localStorage.getItem(REF_STORAGE_KEY));
      if (stored) { try { await join({ data: { token: await token(), code: stored } }); } catch { /* ignore */ } localStorage.removeItem(REF_STORAGE_KEY); }
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.authenticated]);

  const preview = !session.authenticated;
  if (preview && !dash) { setDash({ code: "EJEMPLO", shareBps: AFFILIATE_SHARE_BPS, referred: 3, subReferred: 2, pendingRaw: "1250000", paidRaw: "0", payoutWallet: null, joinedCode: false, earnings: [] }); setCustomCode("EJEMPLO"); }
  const link = dash ? `${window.location.origin}/?ref=${dash.code}` : "";
  return <section className="pt-4" aria-labelledby="invite-hero">
    {!dash ? <p className="mt-4 text-sm text-muted-foreground">{message ?? t("Cargando…")}</p> : <>
      <InviteHero link={link} code={dash.code} referred={dash.referred} pending={(Number(dash.pendingRaw) / 1e6).toFixed(2)} preview={preview} busy={busy} ready={payoutProgress(BigInt(dash.pendingRaw)).ready} missing={(Number(payoutProgress(BigInt(dash.pendingRaw)).missingRaw) / 1e6).toFixed(2)} onClaim={() => void act(collect, "¡Cobro enviado a tu wallet!")} onSaveCode={async (value) => { if (preview) { setDash({ ...dash, code: value }); setMessage(t("Enlace de ejemplo actualizado. Inicia sesión para guardar el tuyo.")); return null; } try { const r = await saveCode({ data: { token: await token(), code: value } }); if (!r.success) return t(r.error ?? "No se pudo completar."); setMessage(t("Tu enlace se actualizó.")); await refresh(); return null; } catch { return t("No se pudo completar."); } }} />
      {dash.shareBps > AFFILIATE_SHARE_BPS && <p className="mt-3 text-center text-sm font-semibold">{t("Socio VIP")} · {dash.shareBps / 100}% {t("de la comisión")}</p>}
      <h2 id="affiliate-title" className="mt-8 flex items-center gap-2 font-display text-xl font-semibold"><Users size={18} />{t("Tu panel")}</h2>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">{t("Invitados")}</dt><dd className="font-semibold">{dash.referred}</dd></div>
        <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">{t("Red secundaria")} ({SUB_AFFILIATE_SHARE_BPS / 100}%)</dt><dd className="font-semibold">{dash.subReferred}</dd></div>
        <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">{t("Por cobrar")}</dt><dd className="font-semibold">{usdc(dash.pendingRaw)} USDC</dd></div>
        <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">{t("Pagado")}</dt><dd className="font-semibold">{usdc(dash.paidRaw)} USDC</dd></div>
      </dl>
      {(() => { const p = payoutProgress(BigInt(dash.pendingRaw)); return <div className="mt-4 rounded-xl border border-border p-4">
        <div className="flex justify-between text-xs text-muted-foreground"><span>{t("Próximo pago")}</span><span className="font-semibold text-foreground">{usdc(dash.pendingRaw)} / {usdc(PAYOUT_MIN_MICRO.toString())} USDC</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.pct}%` }} /></div>
        <p className="mt-2 text-xs text-muted-foreground">{p.ready ? t("¡Listo! Ya puedes cobrar tus ganancias.") : `${t("Te faltan")} ${usdc(p.missingRaw.toString())} USDC ${t("para tu próximo pago.")}`}</p>
        {p.ready && !preview && <div className="mt-3">
          <p className="text-xs text-muted-foreground">{t("Recibes")} <span className="font-semibold text-foreground">{usdc(dash.pendingRaw)} USDC</span> · {t("la tarifa de red la pagas con tu SOL (≈0.003 SOL)")}</p>
          <Button className="mt-2 w-full" disabled={busy} onClick={() => void act(collect, "¡Cobro enviado a tu wallet!")}>{busy ? t("Enviando…") : t("Cobrar ganancias")}</Button>
        </div>}
      </div>; })()}
      <p className="mt-4 text-xs text-muted-foreground">{t("Recibes el")} {dash.shareBps / 100}% {t("de las ganancias de tus invitados.")}</p>
      <div className="mt-2"><AffiliateHow /></div>
      {(() => { const connected = session.walletAddress ?? null; const current = dash.payoutWallet ?? connected; const isConnected = !!current && current === connected; const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`; return <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">{t("Destino de tus ganancias (USDC)")}</p>
        {current ? <p className="mt-2 flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-primary" aria-hidden />{isConnected ? t("Tu wallet conectada") : t("Wallet personalizada")}<span className="font-mono text-xs text-muted-foreground">{short(current)}</span></p> : <p className="mt-2 text-xs text-muted-foreground">{t("Conecta una wallet o escribe una dirección para recibir tus pagos.")}</p>}
        {!editingPayout ? <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { setPayout(current ?? ""); setEditingPayout(true); }}>{t("Cambiar wallet de destino")}</Button>
          {!isConnected && connected && !preview && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void act(async () => savePayout({ data: { token: await token(), wallet: connected } }), "Volviste a tu wallet original.")}>{t("Volver a mi wallet original")}</Button>}
        </div> : <form className="mt-3" onSubmit={(e) => { e.preventDefault(); if (preview) { setEditingPayout(false); return; } void act(async () => savePayout({ data: { token: await token(), wallet: payout.trim() } }), "Wallet de cobro guardada.").then(() => setEditingPayout(false)); }}>
          <label className="block text-sm">{t("Wallet donde recibes tus pagos (USDC)")}<input value={payout} maxLength={44} onChange={(e) => setPayout(e.target.value)} className={field} /></label>
          <div className="mt-2 flex gap-2"><Button type="submit" size="sm" disabled={busy}>{t("Guardar wallet de cobro")}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEditingPayout(false)}>{t("Cancelar")}</Button>{connected && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { setPayout(connected); if (preview) { setEditingPayout(false); return; } void act(async () => savePayout({ data: { token: await token(), wallet: connected } }), "Volviste a tu wallet original.").then(() => setEditingPayout(false)); }}>{t("Volver a mi wallet original")}</Button>}</div>
          {connected && <p className="mt-2 text-xs text-muted-foreground">{t("Tu wallet original")}: <span className="font-mono">{short(connected)}</span></p>}
        </form>}
      </div>; })()}
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Las ganancias se registran cuando la red confirma la operación. Desde 3 USDC las cobras tú mismo, completas, pagando la tarifa de red con tu SOL.")}</p>
      {dash.earnings.length > 0 && <ul className="mt-5 divide-y divide-border text-sm">{dash.earnings.map((e) => <li key={e.signature + e.level} className="flex justify-between gap-3 py-2"><span>{e.kind === "harvest" ? t("Cosecha") : e.kind === "deposit" ? t("Depósito") : t("Cierre")} · {new Date(e.createdAt).toLocaleDateString()}{e.level === 2 && <span className="ml-1 text-xs text-muted-foreground">· {t("Nivel 2")}</span>}</span><span>+{usdc(e.commissionRaw)} USDC · {t(e.status === "paid" ? "Pagado" : e.status === "rejected" ? "Rechazado" : "Por cobrar")}</span></li>)}</ul>}
      <form className="mt-6" onSubmit={(e) => { e.preventDefault(); const c = normalizeCode(code); if (!c) { setMessage(t("Código no válido.")); return; } void (async () => { if (busy) return; setBusy(true); setMessage(null); try { const r = await join({ data: { token: await token(), code: c } }); if (r.success) { setCode(""); setMessage(r.upgradedBps ? `${t("¡Código VIP activado! Tu comisión aumentó al")} ${r.upgradedBps / 100}%.` : t("Código aplicado. ¡Gracias!")); await refresh(); } else setMessage(t(r.error)); } catch { setMessage(t("No se pudo aplicar el código.")); } finally { setBusy(false); } })(); }}>
        <label className="block text-sm">{dash.joinedCode ? t("¿Tienes un código de socio? Escríbelo aquí") : t("¿Te invitó alguien o tienes un código de socio? Escríbelo")}<input value={code} maxLength={16} onChange={(e) => setCode(e.target.value)} className={field} /></label>
        <Button type="submit" size="sm" variant="outline" className="mt-2" disabled={busy}>{t("Aplicar código")}</Button>
      </form>
    </>}
    {dash && message && <p role="status" className="mt-4 text-sm text-muted-foreground">{message}</p>}
  </section>;
}
